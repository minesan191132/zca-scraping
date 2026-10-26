import { execFile } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Environment } from '@shared/setup'

export type { Environment }

const ZALO_DIR = /^Zalo-(\d+(?:\.\d+)*)$/

/** So hai số phiên bản theo từng đoạn số (9.0 < 10.1), không theo chữ. */
function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/**
 * Trong `programsDir` chọn thư mục `Zalo-<phiên bản>` lớn nhất mà có `Zalo.exe`; không có thì null.
 * Khác `findZaloExe` của bot (nó sắp theo chữ): chủ ý, vì thế bước thiết lập ghi đường dẫn này vào config.json cho bot dùng.
 */
export function pickZaloExe(
  programsDir: string,
  list: (dir: string) => string[],
  exists: (file: string) => boolean
): string | null {
  const found = list(programsDir)
    .map((name) => ({ name, m: ZALO_DIR.exec(name) }))
    .filter((x): x is { name: string; m: RegExpExecArray } => x.m !== null)
    .map((x) => ({ name: x.name, ver: x.m[1].split('.').map(Number) }))
    .sort((a, b) => compareVersions(b.ver, a.ver))
  for (const f of found) {
    const exe = join(programsDir, f.name, 'Zalo.exe')
    if (exists(exe)) return exe
  }
  return null
}

/** true khi đầu ra `reg query` có dòng `(Default)` mang GUID (Excel đã đăng ký COM, kể cả Click-to-Run). */
export function parseExcelProbe(regOutput: string): boolean {
  return /\(Default\)\s+REG_SZ\s+\{[0-9A-Fa-f-]{36}\}/.test(regOutput)
}

function probeExcel(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      'reg',
      ['query', 'HKCR\\Excel.Application\\CLSID', '/ve'],
      { windowsHide: true, timeout: 10_000 },
      (err, stdout) => resolve(!err && parseExcelProbe(stdout))
    )
  })
}

function listDir(dir: string): string[] {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

export async function detectEnvironment(): Promise<Environment> {
  const local = process.env.LOCALAPPDATA
  const zaloExe = local ? pickZaloExe(join(local, 'Programs', 'Zalo'), listDir, existsSync) : null
  return { zaloExe, excelInstalled: await probeExcel() }
}
