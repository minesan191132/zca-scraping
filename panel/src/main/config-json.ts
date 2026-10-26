import type { ConfigDump } from '@shared/ipc'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

const kindOf = (v: unknown): string => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)

function setPath(target: Obj, path: string, value: unknown): void {
  const keys = path.split('.')
  let cur = target
  for (const k of keys.slice(0, -1)) {
    if (!isObj(cur[k])) cur[k] = {}
    cur = cur[k] as Obj
  }
  cur[keys[keys.length - 1]] = value
}

/** Đổi đường dẫn phẳng ({"vision.leave.groups": [...]}) thành object lồng nhau. */
export function overlayToConfigJson(overlay: Obj): Obj {
  const out: Obj = {}
  for (const [path, value] of Object.entries(overlay)) setPath(out, path, value)
  return out
}

/** Lỗi của overlay: khóa không có trong `dump.settings`, hoặc kiểu khác kiểu của giá trị hiện tại (null chỉ để bỏ khóa, luôn được). */
export function validateOverlay(overlay: Obj, dump: ConfigDump): string[] {
  const errors: string[] = []
  for (const [path, value] of Object.entries(overlay)) {
    const setting = dump.settings.find((s) => s.path === path)
    if (!setting) {
      errors.push(`${path}: khóa không có trong cấu hình`)
      continue
    }
    const want = kindOf(setting.value)
    if (value === null || want === 'null') continue
    if (kindOf(value) !== want) errors.push(`${path}: cần kiểu ${want}, nhận ${kindOf(value)}`)
  }
  return errors
}

function deletePath(target: Obj, path: string): void {
  const keys = path.split('.')
  let cur: Obj = target
  for (const k of keys.slice(0, -1)) {
    const next = cur[k]
    if (!isObj(next)) return
    cur = next
  }
  delete cur[keys[keys.length - 1]]
}

/**
 * Áp overlay lên `config.json` hiện có theo từng đường dẫn: khóa overlay thay giá trị cũ (mảng và bảng tra thay nguyên khối),
 * khóa không được nhắc tới giữ nguyên, giá trị null bỏ khóa để bot dùng mặc định. Không sửa `existing`.
 */
export function mergeOverlay(existing: Obj, overlay: Obj): Obj {
  const out = structuredClone(existing)
  for (const [path, value] of Object.entries(overlay)) {
    if (value === null) deletePath(out, path)
    else setPath(out, path, value)
  }
  return out
}

/** Làm phẳng `config.json` theo các đường dẫn của `dump.settings`: chỉ khóa có trong file mới vào overlay. */
export function flattenConfig(config: Obj, dump: ConfigDump): Obj {
  const out: Obj = {}
  for (const s of dump.settings) {
    let cur: unknown = config
    for (const k of s.path.split('.')) cur = isObj(cur) ? cur[k] : undefined
    if (cur !== undefined) out[s.path] = cur
  }
  return out
}
