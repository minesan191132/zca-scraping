import type { BotId, JobRequest } from './bots'
import type { BotStatus } from './status'

export interface ProjectInfo {
  /** chosen bot project folder, null until one is chosen */
  dir: string | null
  /** required scripts the folder does not define */
  missing: string[]
  /** `config:dump` exists, so the settings tabs work */
  configReady: boolean
  /** bản cài (CLI đã gộp): chỉ hai bot, không trang tác vụ, có thẻ giấy phép; vắng mặt ở chế độ mã nguồn */
  bundled?: boolean
}

export interface ConfigSetting {
  section: string
  path: string
  unit: string
  default: unknown
  hasDefault: boolean
  defaultLabel: string | null
  readers: string[]
  note: string
  value: unknown
}

export interface ConfigDump {
  sections: string[]
  settings: ConfigSetting[]
}

export type ConfigLoadResult =
  | { ok: true; dump: ConfigDump; overlay: Record<string, unknown>; overlayFile: string }
  | { ok: false; code: 'no-project' | 'missing-script' | 'failed'; error: string }

/** Trạng thái giấy phép do CLI `license-info` báo (src/cli/license-info.ts); `customer` và `expiresAt` chỉ có khi `state` là "ok". */
export interface LicenseInfo {
  state:
    | 'ok'
    | 'missing'
    | 'bad-format'
    | 'bad-signature'
    | 'wrong-machine'
    | 'machine-unreadable'
    | 'expired'
  customer: string | null
  expiresAt: string | null
  machineId: string | null
}

/** Kết quả lưu cấu hình ở chế độ bản cài: `warnings` là các dòng `[config] ...` của chính bot; ghi lỗi thì file cũ được giữ. */
export type ConfigSaveResult =
  { ok: true; file: string; warnings: string[] } | { ok: false; errors: string[] }

export interface ActionResult {
  ok: boolean
  error?: string
}

export interface LogLine {
  /** a bot id or "jobs" */
  channel: string
  line: string
}

export type Theme = 'light' | 'dark'

export interface PanelApi {
  projectGet(): Promise<ProjectInfo>
  /** opens the folder picker; null when the user cancels */
  projectChoose(): Promise<ProjectInfo | null>
  status(): Promise<BotStatus[]>
  startBot(id: BotId): Promise<ActionResult>
  stopBot(id: BotId, pid: number | null): Promise<ActionResult>
  runJob(request: JobRequest): Promise<ActionResult>
  configLoad(): Promise<ConfigLoadResult>
  configSave(overlay: Record<string, unknown>): Promise<ConfigSaveResult>
  licenseGet(): Promise<LicenseInfo>
  /** nhận đường dẫn file giấy phép người dùng đã chọn; ném lỗi khi file không phải giấy phép */
  licenseImport(sourcePath: string): Promise<LicenseInfo>
  /** mở hộp chọn file giấy phép; null khi người dùng hủy */
  licensePick(): Promise<string | null>
  setTheme(theme: Theme): Promise<void>
  onLog(cb: (line: LogLine) => void): () => void
  onBotExit(cb: (e: { id: BotId; code: number | null }) => void): () => void
  onJobState(cb: (e: { running: boolean; ok?: boolean }) => void): () => void
  /** có bản cập nhật đã tải xong, sẽ cài ở lần mở panel sau */
  onUpdateDownloaded(cb: (e: { version: string }) => void): () => void
}

export const CHANNELS = {
  projectGet: 'project:get',
  projectChoose: 'project:choose',
  status: 'status',
  startBot: 'bot:start',
  stopBot: 'bot:stop',
  runJob: 'job:run',
  configLoad: 'config:load',
  configSave: 'config:save',
  licenseGet: 'license:get',
  licenseImport: 'license:import',
  licensePick: 'license:pick',
  setTheme: 'theme:set',
  log: 'log',
  botExit: 'bot:exit',
  jobState: 'job:state',
  updateDownloaded: 'update:downloaded'
} as const
