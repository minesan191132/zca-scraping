// Quy tắc cài cập nhật an toàn (logic thuần). Phần nối với `electron-updater` thêm sau khi người dùng chọn kho phát hành.

export interface InstallGuard {
  botsRunning: boolean
  jobRunning: boolean
  scrapeLockHeld: boolean
}

/** Chỉ cài khi không có bot, không có job và không ai giữ data/.scrape.lock: bản cài thay chính file exe mà các bot gộp đang chạy bằng. */
export function canInstallNow(g: InstallGuard): boolean {
  return !g.botsRunning && !g.jobRunning && !g.scrapeLockHeld
}

export type UpdateEvent =
  { kind: 'none' } | { kind: 'downloaded'; version: string } | { kind: 'error'; message: string }

/** Mất mạng hay kho không có bản mới đều "quiet": không báo gì gây hoang mang. */
export function describeUpdate(e: UpdateEvent): { text: string; severity: 'info' | 'quiet' } {
  switch (e.kind) {
    case 'downloaded':
      return { text: `Có bản mới ${e.version}, sẽ cài ở lần mở sau`, severity: 'info' }
    case 'error':
      return { text: e.message, severity: 'quiet' }
    case 'none':
      return { text: '', severity: 'quiet' }
  }
}

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000

export interface UpdaterDeps {
  /** Bản cài có `app-update.yml` (electron-builder chỉ ghi khi có khối `publish`) thì mới bật; không thì tắt im lặng. */
  enabled: boolean
  log: (line: string) => void
  guard: () => Promise<InstallGuard>
  emit: (e: UpdateEvent) => void
}

/**
 * Kiểm cập nhật lúc khởi động và mỗi 6 giờ. Chỉ cài ở lần kiểm ĐẦU sau khi mở panel (lúc đó chưa bot nào do panel này chạy) và khi
 * `canInstallNow`; các lần sau chỉ báo "sẽ cài ở lần mở sau". Không cài lúc thoát. Lỗi mạng chỉ ghi nhật ký.
 */
export async function startUpdater(deps: UpdaterDeps): Promise<void> {
  if (!deps.enabled) return
  try {
    const mod = await import('electron-updater')
    const autoUpdater = (mod.default ?? mod).autoUpdater
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.logger = null
    let first = true
    autoUpdater.on('update-not-available', () => deps.emit({ kind: 'none' }))
    autoUpdater.on('error', (err: Error) => {
      deps.log(`[updater] ${err.message}`)
      deps.emit({ kind: 'error', message: err.message })
    })
    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      const atStartup = first
      void deps.guard().then((g) => {
        if (atStartup && canInstallNow(g)) {
          deps.log(`[updater] cài bản ${info.version}`)
          autoUpdater.quitAndInstall(true, true)
        } else {
          deps.emit({ kind: 'downloaded', version: info.version })
        }
      })
    })
    const check = (): void => {
      // Lỗi đã ghi ở sự kiện 'error' phía trên; promise bị từ chối cùng lỗi đó nên bỏ qua để khỏi ghi hai lần.
      void autoUpdater.checkForUpdates().catch(() => undefined)
    }
    check()
    // Sau lần kiểm đầu, các bản tải được chỉ báo chứ không cài ngay.
    setTimeout(() => (first = false), 60_000).unref()
    setInterval(check, CHECK_EVERY_MS).unref()
  } catch (e) {
    deps.log(`[updater] tắt: ${(e as Error).message}`)
  }
}
