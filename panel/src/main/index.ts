import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app, BrowserWindow, nativeTheme } from 'electron'
import { CHANNELS } from '@shared/ipc'
import { BotManager } from './bots'
import { SOURCE_MODE, type Mode } from './command'
import { ConfigBridge } from './config-bridge'
import { LicenseService } from './license'
import { registerIpc } from './ipc'
import { ProjectStore } from './project'
import { startUpdater } from './updater'

// Tests run against a throwaway user data folder (first-run picker, saved project, draft file).
if (process.env.PANEL_USER_DATA) app.setPath('userData', process.env.PANEL_USER_DATA)

let win: BrowserWindow | null = null
const send = (channel: string, payload: unknown): void => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
}

function createWindow(): void {
  // Hidden until the first paint, with a background that matches the theme, so a light theme never flashes dark.
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'Zalo Bots',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#12141a' : '#f8f6f1',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.once('ready-to-show', () => win?.show())

  if (process.env.ELECTRON_RENDERER_URL && !app.isPackaged)
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))

  if (process.env.PANEL_STEPS) runShotSteps(win)
}

/**
 * Test hook. PANEL_STEPS is a JSON list of {js, shot}: wait until the first status poll is in, then run each script in the page
 * and save a screenshot. An occluded window paints lazily, so throttling is off and the page is invalidated before each capture.
 */
function runShotSteps(target: BrowserWindow): void {
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
  const log = (text: string): void => {
    if (process.env.PANEL_LOG) writeFileSync(process.env.PANEL_LOG, text + '\n', { flag: 'a' })
  }
  target.webContents.once('did-finish-load', async () => {
    target.webContents.setBackgroundThrottling(false)
    target.show()
    target.focus()
    const ready = process.env.PANEL_READY ?? 'window.__panelReady === true'
    for (let i = 0; i < 120; i++) {
      if (await target.webContents.executeJavaScript(ready).catch(() => false)) break
      await wait(1000)
    }
    for (const step of JSON.parse(process.env.PANEL_STEPS ?? '[]') as {
      js: string
      shot: string
    }[]) {
      try {
        await target.webContents.executeJavaScript(step.js)
      } catch (e) {
        log(`[step-error] ${step.shot}: ${(e as Error).message}`)
      }
      await wait(900)
      target.webContents.invalidate()
      await wait(250)
      writeFileSync(step.shot, (await target.webContents.capturePage()).toPNG())
    }
    log('[steps-done]')
    app.quit()
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  const userData = (): string => app.getPath('userData')
  // Where the app lives decides where to look for the bot project: a panel built inside the project, or next to it, finds it alone.
  const starts = [
    app.getAppPath(),
    dirname(process.execPath),
    process.env.PORTABLE_EXECUTABLE_DIR
  ].filter((p): p is string => typeof p === 'string' && p !== '')
  const defaultFile = app.isPackaged ? join(process.resourcesPath, 'default-project.json') : null
  // Bản cài: có thư mục `dist` (CLI đã gộp) cạnh resources. Dữ liệu và cấu hình ở %LOCALAPPDATA%\BaoCaoNhom, không ở thư mục cài.
  const bundled = app.isPackaged && existsSync(join(process.resourcesPath, 'dist'))
  const mode = (): Mode =>
    bundled
      ? {
          bundled: true,
          resources: process.resourcesPath,
          home: join(process.env.LOCALAPPDATA ?? app.getPath('appData'), 'BaoCaoNhom'),
          execPath: process.execPath
        }
      : SOURCE_MODE
  const project = new ProjectStore(userData(), { starts, defaultFile }, mode)
  const config = new ConfigBridge(userData(), mode)
  const license = new LicenseService(mode)
  const bots = new BotManager(
    () => project.dir,
    {
      log: (line) => send(CHANNELS.log, line),
      botExit: (e) => send(CHANNELS.botExit, e),
      jobState: (e) => send(CHANNELS.jobState, e)
    },
    mode
  )

  app.whenReady().then(() => {
    registerIpc({ window: () => win, project, config, bots, license })
    createWindow()
    if (bundled) {
      const m = mode()
      void startUpdater({
        enabled: existsSync(join(process.resourcesPath, 'app-update.yml')),
        log: (line) => console.log(line),
        emit: (e) => {
          if (e.kind === 'downloaded') send(CHANNELS.updateDownloaded, { version: e.version })
        },
        guard: async () => ({
          // Bot do một phiên panel trước khởi động rồi mồ côi cũng tính: lệnh trạng thái thấy tiến trình còn sống.
          botsRunning: (await bots.status()).some((b) => b.state === 'alive' || b.state === 'warn'),
          jobRunning: bots.jobRunning(),
          scrapeLockHeld: m.bundled ? existsSync(join(m.home, 'data', '.scrape.lock')) : false
        })
      })
    }
  })
  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })
  app.on('window-all-closed', () => app.quit())
  // The process table is read asynchronously, so quitting waits until the bots this app started are stopped.
  let stopping = false
  app.on('before-quit', (event) => {
    if (stopping || !bots.hasOwned()) return
    event.preventDefault()
    stopping = true
    void bots.killOwned().finally(() => app.exit(0))
  })
}
