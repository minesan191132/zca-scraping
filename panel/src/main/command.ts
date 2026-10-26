import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { BUNDLED_BOT_IDS } from '@shared/bots'

/** Một lệnh con để chạy: chương trình, tham số (luôn là mảng, đường cài có khoảng trắng nằm trong một phần tử) và biến môi trường thêm. */
export interface Command {
  command: string
  args: string[]
  env: Record<string, string>
}

/**
 * Bản cài (`bundled`): chạy `dist/cli/*.js` bằng chính file Electron ở chế độ Node, không cần Node, `npm` hay `package.json`.
 * Chế độ mã nguồn (`bundled` false): `npm run` trong thư mục dự án như trước.
 */
export interface Mode {
  bundled: boolean
  /** thư mục `resources` của bản cài (chứa `dist/`) */
  resources: string
  /** thư mục dữ liệu ghi được (`ZBOT_HOME`) */
  home: string
  /** file Electron đang chạy */
  execPath: string
}

export const SOURCE_MODE: Mode = { bundled: false, resources: '', home: '', execPath: '' }

/** Hai bot có trong bản bán; định nghĩa ở shared/bots.ts, xuất lại đây cho các file main. */
export { BUNDLED_BOT_IDS }

/** Script npm của chế độ mã nguồn -> tên file trong `dist/cli` (không đuôi). Script không có ở đây thì không thuộc bản bán. */
export const BUNDLED_ENTRIES: Record<string, string> = {
  'bot:watch': 'bot-watch-core',
  'bot:runner': 'bot-dispatch',
  'bot:scrape': 'bot-scrape',
  'config:dump': 'config-dump',
  'export:excel': 'export-excel',
  'watch:status': 'watch-status-core',
  'runner:status': 'dispatch-status',
  'license:info': 'license-info'
}

/** Lệnh chạy một script (kèm tham số thêm sau `--`); null khi bản cài không có script đó. */
export function scriptCommand(script: string, mode: Mode, extra: string[] = []): Command | null {
  if (!mode.bundled)
    return {
      command: 'cmd.exe',
      args: ['/c', 'npm', 'run', '-s', script, ...(extra.length > 0 ? ['--', ...extra] : [])],
      env: {}
    }
  const entry = BUNDLED_ENTRIES[script]
  if (!entry) return null
  return {
    command: mode.execPath,
    args: [join(mode.resources, 'dist', 'cli', `${entry}.js`), ...extra],
    env: {
      ELECTRON_RUN_AS_NODE: '1',
      ZBOT_BUNDLED: '1',
      ZBOT_HOME: mode.home,
      ZBOT_CODE_ROOT: mode.resources
    }
  }
}

/**
 * Một bước của tác vụ (`jobSteps`: `['run', '<script>', '--', ...tham số]`) thành lệnh. Chế độ mã nguồn giữ đúng
 * `cmd.exe /c npm -s <bước>` như trước.
 */
export function stepCommand(step: string[], mode: Mode): Command | null {
  if (!mode.bundled) return { command: 'cmd.exe', args: ['/c', 'npm', '-s', ...step], env: {} }
  if (step[0] !== 'run' || !step[1]) return null
  const dash = step.indexOf('--')
  return scriptCommand(step[1], mode, dash < 0 ? [] : step.slice(dash + 1))
}

export interface RunResult {
  code: number
  stdout: string
  stderr: string
}

export type Runner = (cmd: Command, cwd: string, timeout: number) => Promise<RunResult>

/** Chạy lệnh tới khi xong, không bao giờ reject. */
export const runCommand: Runner = (cmd, cwd, timeout) =>
  new Promise((resolve) => {
    execFile(
      cmd.command,
      cmd.args,
      {
        cwd,
        timeout,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, ...cmd.env }
      },
      (err, stdout, stderr) =>
        resolve({
          code: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
          stdout: String(stdout),
          stderr: String(stderr)
        })
    )
  })
