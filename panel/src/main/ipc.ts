import { BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron'
import { isBotId, parseJobRequest } from '@shared/bots'
import { CHANNELS, type Theme } from '@shared/ipc'
import { BotManager } from './bots'
import { LicenseService } from './license'
import { ConfigBridge } from './config-bridge'
import { ProjectStore } from './project'

export interface Services {
  window: () => BrowserWindow | null
  project: ProjectStore
  config: ConfigBridge
  bots: BotManager
  license: LicenseService
}

const fail = (error: string): { ok: false; error: string } => ({ ok: false as const, error })

export function registerIpc({ window, project, config, bots, license }: Services): void {
  ipcMain.handle(CHANNELS.projectGet, () => project.info())

  ipcMain.handle(CHANNELS.projectChoose, async () => {
    // Bản cài không có thư mục dự án để chọn.
    if (project.bundled) return null
    const win = window()
    const options = { properties: ['openDirectory' as const], title: 'zca-scrape-message' }
    const picked = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (picked.canceled || !picked.filePaths[0]) return null
    const inspection = project.choose(picked.filePaths[0])
    // a rejected folder is reported through `missing`; info() still describes the folder that is in use
    return inspection.valid && inspection.missing.length === 0
      ? project.info()
      : { dir: null, missing: inspection.missing, configReady: false }
  })

  ipcMain.handle(CHANNELS.status, () => bots.status())

  ipcMain.handle(CHANNELS.startBot, (_e, id: unknown) =>
    isBotId(id) ? bots.start(id) : fail('unknown-bot')
  )
  ipcMain.handle(CHANNELS.stopBot, (_e, id: unknown, pid: unknown) =>
    isBotId(id) ? bots.stop(id, typeof pid === 'number' ? pid : null) : fail('unknown-bot')
  )
  ipcMain.handle(CHANNELS.runJob, (_e, request: unknown) => {
    const parsed = parseJobRequest(request)
    return parsed ? bots.runJob(parsed) : fail('bad-job')
  })

  ipcMain.handle(CHANNELS.configLoad, () => {
    const info = project.info()
    return config.load(info.dir, info.configReady)
  })
  ipcMain.handle(CHANNELS.configSave, (_e, overlay: unknown) =>
    config.save(
      overlay && typeof overlay === 'object' ? (overlay as Record<string, unknown>) : {},
      project.info().dir
    )
  )

  ipcMain.handle(CHANNELS.licenseGet, () => license.get())
  ipcMain.handle(CHANNELS.licenseImport, (_e, path: unknown) =>
    typeof path === 'string' ? license.import(path) : Promise.reject(new Error('bad-path'))
  )
  ipcMain.handle(CHANNELS.licensePick, async () => {
    const win = window()
    const options = {
      properties: ['openFile' as const],
      title: 'license.json',
      filters: [{ name: 'License', extensions: ['json'] }]
    }
    const picked = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    return picked.canceled || !picked.filePaths[0] ? null : picked.filePaths[0]
  })

  ipcMain.handle(CHANNELS.setTheme, (_e, theme: Theme) => {
    const dark = theme === 'dark'
    nativeTheme.themeSource = dark ? 'dark' : 'light'
    window()?.setBackgroundColor(dark ? '#0a0a0a' : '#ffffff')
  })
}
