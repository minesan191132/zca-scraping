// Logic thuần của màn hình thiết lập lần đầu: kiểm danh sách nhóm, thư mục xuất, và bước dở đầu tiên. Không đụng Electron hay đĩa.

export interface Environment {
  zaloExe: string | null
  excelInstalled: boolean
}

export type SetupStep = 'license' | 'environment' | 'groups' | 'output' | 'done'

export interface SetupInput {
  licenseOk: boolean
  env: Environment
  targets: string[]
  statusExportDir: string | null
}

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g

/**
 * Làm sạch danh sách tên nhóm: cắt khoảng trắng, bỏ dòng rỗng, bỏ ký tự điều khiển, bỏ trùng (không phân biệt hoa thường, giữ lần đầu).
 * Không đổi hoa thường hay dấu của tên vì Zalo phân biệt.
 */
export function normalizeTargets(input: string[]): { targets: string[]; errors: string[] } {
  const targets: string[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  for (const raw of input) {
    const cleaned = raw.replace(CONTROL, '')
    if (cleaned !== raw) errors.push(`bỏ ký tự điều khiển: ${JSON.stringify(raw)}`)
    const name = cleaned.trim()
    if (name === '') continue
    const key = name.toLowerCase()
    if (seen.has(key)) {
      errors.push(`bỏ trùng: ${name}`)
      continue
    }
    seen.add(key)
    targets.push(name)
  }
  if (targets.length === 0) errors.push('chưa có nhóm nào')
  return { targets, errors }
}

/** null = hợp lệ. Phải là đường dẫn tuyệt đối Windows và không nằm trong Program Files hay thư mục cài của panel. */
export function validateExportDir(dir: string, installDir?: string): string | null {
  const d = dir.trim()
  if (d === '') return 'chưa chọn thư mục xuất'
  if (!/^[A-Za-z]:\\/.test(d)) return 'thư mục xuất phải là đường dẫn đầy đủ, ví dụ D:\\BaoCao'
  const low = d.toLowerCase()
  if (low.includes('\\program files\\') || low.includes('\\program files (x86)\\')) {
    return 'không đặt thư mục xuất trong Program Files'
  }
  if (installDir) {
    const inst = installDir.toLowerCase().replace(/\\+$/, '')
    if (low === inst || low.startsWith(inst + '\\'))
      return 'không đặt thư mục xuất trong thư mục cài đặt của ứng dụng'
  }
  return null
}

/** Bước dở đầu tiên. Thiếu Excel không chặn; thiếu Zalo Desktop thì chặn ở `environment` vì không có gì để cào. */
export function nextSetupStep(input: SetupInput): SetupStep {
  if (!input.licenseOk) return 'license'
  if (!input.env.zaloExe) return 'environment'
  if (input.targets.length === 0) return 'groups'
  if (input.statusExportDir === null || validateExportDir(input.statusExportDir) !== null)
    return 'output'
  return 'done'
}

/** Cảnh báo không chặn. */
export function setupProblems(input: SetupInput): string[] {
  const out: string[] = []
  if (!input.env.excelInstalled) out.push('Không tìm thấy Excel: báo cáo Excel sẽ không dựng được')
  return out
}

/** Phần config.json bước `environment` ghi để bot dùng đúng Zalo.exe mà màn hình đang hiện. */
export function setupConfigPatch(env: Environment): Record<string, unknown> {
  return env.zaloExe ? { zaloExePath: env.zaloExe } : {}
}
