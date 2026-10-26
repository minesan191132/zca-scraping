/** Lines kept per channel, and how many the log view draws. */
export const MAX_LINES = 3000
export const SHOW_LINES = 1000

export interface LogEntry {
  t: number
  text: string
  level: 'plain' | 'mark' | 'error' | 'warn'
}

// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g

export function classify(text: string): LogEntry['level'] {
  if (/^(──|══)/.test(text)) return 'mark'
  if (/error|lỗi|fatal|✗|exception/i.test(text)) return 'error'
  if (/warn|cảnh báo|cần xem/i.test(text)) return 'warn'
  return 'plain'
}

const channels = $state<Record<string, LogEntry[]>>({})

export const logs = {
  lines(channel: string): readonly LogEntry[] {
    return channels[channel] ?? []
  },
  push(channel: string, raw: string, t = Date.now()): void {
    const text = raw.replace(ANSI, '')
    const list = channels[channel] ?? []
    list.push({ t, text, level: classify(text) })
    if (list.length > MAX_LINES) list.splice(0, list.length - MAX_LINES)
    channels[channel] = list
  },
  clear(channel: string): void {
    channels[channel] = []
  }
}
