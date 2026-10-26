import { BOT_IDS, BUNDLED_BOT_IDS, type BotId } from '@shared/bots'
import type { ProjectInfo } from '@shared/ipc'

let info = $state<ProjectInfo | null>(null)
/** scripts the last rejected folder lacked */
let rejected = $state<string[]>([])

export const project = {
  get info(): ProjectInfo | null {
    return info
  },
  get loaded(): boolean {
    return info !== null
  },
  get dir(): string | null {
    return info?.dir ?? null
  },
  /** bản cài (CLI đã gộp): chỉ hai bot, không trang tác vụ */
  get bundled(): boolean {
    return info?.bundled === true
  },
  /** các bot hiện trên giao diện */
  get botIds(): readonly BotId[] {
    return info?.bundled === true ? BUNDLED_BOT_IDS : BOT_IDS
  },
  get rejected(): readonly string[] {
    return rejected
  },
  async refresh(): Promise<void> {
    info = await window.api.projectGet()
  },
  /** Opens the folder picker. Returns true when a usable folder was saved. */
  async choose(): Promise<boolean> {
    const result = await window.api.projectChoose()
    if (result === null) return false
    if (result.dir) {
      info = result
      rejected = []
      return true
    }
    rejected = result.missing
    return false
  }
}
