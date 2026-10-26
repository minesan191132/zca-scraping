import type { ParsedStatus } from '@shared/status'

/**
 * A killed bot never writes "stopped", so its status file keeps saying "running" until the heartbeat goes stale (90 s by default).
 * When the status line names a pid and that process does not exist, the bot is not running, whatever the file says.
 */
export function reconcileWithProcess(
  parsed: ParsedStatus,
  isAlive: (pid: number) => boolean
): ParsedStatus {
  const claimsRunning = parsed.state === 'alive' || parsed.state === 'warn'
  if (!claimsRunning || parsed.pid === null || isAlive(parsed.pid)) return parsed
  return { ...parsed, state: 'stopped', kind: 'gone', dry: false }
}

const BOT_LINE = /^\[(watch|runner|chat|total)\]/

/**
 * Reads the output of a `*:status` command.
 *
 * The exit code cannot be trusted: `watch:status` exits 0 even when the bot is stopped or dead, so "exit 0 = running" showed a
 * stopped bot as running and greyed out its Start button. The first `[bot]` line decides. A warning npm prints before it is skipped.
 * Anything not recognised is "dead / unknown": never claim a bot is running on a guess.
 */
export function parseStatus(exitCode: number, text: string): ParsedStatus {
  const lines = text.split(/\r?\n/)
  const headline = lines.find((l) => BOT_LINE.test(l)) ?? lines[0] ?? ''
  const pid = headline.match(/pid (\d+)/)?.[1]
  const time = headline.match(/\b(\d{2}:\d{2})\b/)?.[1] ?? null
  const base = { time: null, since: null, dry: false, headline, pid: pid ? Number(pid) : null }

  if (/ĐÃ DỪNG/.test(headline)) return { ...base, state: 'stopped', kind: 'stopped', time }
  if (/CÓ VẺ ĐÃ CHẾT/.test(headline)) return { ...base, state: 'dead', kind: 'dead', time }
  if (/chưa từng chạy|chưa có dữ liệu/.test(headline))
    return { ...base, state: 'dead', kind: 'never' }
  if (/ĐANG CHẠY NHƯNG MÙ/.test(headline)) return { ...base, state: 'warn', kind: 'blind', time }
  if (/\bLỖI\b/.test(headline) && pid) return { ...base, state: 'warn', kind: 'error' }
  if (/ĐANG CHẠY/.test(headline)) {
    const since = headline.match(/từ (\d{2}\/\d{2} \d{2}:\d{2}|\d{2}:\d{2})/)?.[1] ?? null
    return { ...base, state: 'alive', kind: 'running', since, dry: /DRY-RUN/.test(headline) }
  }
  // exit code 1 means the status command itself failed; either way the state is unknown
  void exitCode
  return { ...base, state: 'dead', kind: 'unknown' }
}
