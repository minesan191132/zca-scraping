import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { LicenseInfo } from '@shared/ipc'
import { runCommand, scriptCommand, SOURCE_MODE, type Mode, type Runner } from './command'

export type { LicenseInfo }

const MARKER = '@@JSON@@'
const STATES: readonly string[] = [
  'ok',
  'missing',
  'bad-format',
  'bad-signature',
  'wrong-machine',
  'machine-unreadable',
  'expired'
]

const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null)

/** Đọc dòng JSON sau `@@JSON@@`; ném lỗi nêu rõ khi đầu ra không đúng hình dạng. */
export function parseLicenseInfo(output: string): LicenseInfo {
  const at = output.indexOf(MARKER)
  if (at < 0) throw new Error(output.trim().slice(0, 400) || 'license-info: no output')
  const raw = JSON.parse(output.slice(at + MARKER.length).split(/\r?\n/)[0]) as Record<
    string,
    unknown
  >
  if (typeof raw.state !== 'string' || !STATES.includes(raw.state))
    throw new Error('license-info: unexpected state')
  return {
    state: raw.state as LicenseInfo['state'],
    customer: strOrNull(raw.customer),
    expiresAt: strOrNull(raw.expiresAt),
    machineId: strOrNull(raw.machineId)
  }
}

/** Một file giấy phép là JSON có `payload` và `sig` dạng chuỗi; chữ ký do CLI kiểm, panel chỉ chặn file hiển nhiên sai. */
function looksLikeLicense(text: string): boolean {
  try {
    const v = JSON.parse(text) as Record<string, unknown>
    return typeof v.payload === 'string' && typeof v.sig === 'string'
  } catch {
    return false
  }
}

/** Trạng thái và nhập giấy phép. Panel không có mã xác minh riêng: nó hỏi CLI gộp `license-info`. */
export class LicenseService {
  constructor(
    private readonly mode: () => Mode = () => SOURCE_MODE,
    private readonly run: Runner = runCommand
  ) {}

  /** Chế độ mã nguồn (máy tác giả) không bị chặn bởi giấy phép: trả "ok" không kèm khách hàng. */
  async get(): Promise<LicenseInfo> {
    const mode = this.mode()
    if (!mode.bundled) return { state: 'ok', customer: null, expiresAt: null, machineId: null }
    const cmd = scriptCommand('license:info', mode)
    if (!cmd) throw new Error('license-info: not in bundle')
    const r = await this.run(cmd, mode.resources, 30_000)
    return parseLicenseInfo(`${r.stdout}\n${r.stderr}`)
  }

  /**
   * Chép file người dùng chọn vào `<home>/license.json`, rồi hỏi CLI `license-info` có chấp nhận không. Chỉ giữ file mới khi trạng thái là "ok":
   * ngược lại giấy phép đang dùng được khôi phục nguyên vẹn (một file đúng dạng mà sai chữ ký hay sai máy không được làm hỏng giấy phép đang chạy tốt)
   * và hàm ném `license-rejected:<trạng thái>`. Nguồn không đọc được hoặc không phải giấy phép thì không ghi gì.
   */
  async import(sourcePath: string): Promise<LicenseInfo> {
    const mode = this.mode()
    const text = readFileSync(sourcePath, 'utf8')
    if (!looksLikeLicense(text))
      throw new Error('không phải file giấy phép (thiếu payload hoặc sig)')
    mkdirSync(mode.home, { recursive: true })
    const target = join(mode.home, 'license.json')
    const tmp = `${target}.tmp`
    const bak = `${target}.bak`
    try {
      copyFileSync(sourcePath, tmp)
    } catch (e) {
      rmSync(tmp, { force: true })
      throw e
    }
    const hadOld = existsSync(target)
    const restore = (): void => {
      rmSync(target, { force: true })
      if (hadOld) renameSync(bak, target)
    }
    if (hadOld) renameSync(target, bak)
    renameSync(tmp, target)
    let info: LicenseInfo
    try {
      info = await this.get()
    } catch (e) {
      restore()
      throw e
    }
    if (info.state !== 'ok') {
      restore()
      throw new Error(`license-rejected:${info.state}`)
    }
    rmSync(bak, { force: true })
    return info
  }
}
