// Cài đặt nào hiện trong bản cài (bản bán): chỉ những gì lõi cào và bộ điều phối mỏng thực sự đọc. Phần báo cáo của tổ chức khác (reportSets,
// phases, sessions, techReports, vision, chat, total, print, recovery) không có trong gói nên không hiện, để khách khỏi chỉnh thứ vô nghĩa.

/** Khóa gốc (không có dấu chấm) được hiện. */
const ROOT_KEYS: ReadonlySet<string> = new Set([
  'cdpPort',
  'zaloExePath',
  'autoLaunchZalo',
  'dataDir',
  'targets',
  'sinceTs',
  'untilTs',
  'targetMessageCount',
  'scrollDelayMs'
])

/** Nhóm khóa (tiền tố trước dấu chấm đầu tiên) được hiện. */
const PREFIXES: ReadonlySet<string> = new Set(['watch', 'runner'])

export function isBundledSetting(path: string): boolean {
  const dot = path.indexOf('.')
  return dot < 0 ? ROOT_KEYS.has(path) : PREFIXES.has(path.slice(0, dot))
}
