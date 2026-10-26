// How each setting is edited. Ported from the demo's config editor.

export type SettingKind =
  'time' | 'enum' | 'list' | 'sets' | 'aliases' | 'range' | 'text' | 'bool' | 'number' | 'json'

export const TIME_PATHS = new Set(['sinceTs', 'untilTs'])
export const LIST_PATHS = new Set([
  'targets',
  'recoveryIgnoreTargets',
  'vision.leave.groups',
  'vision.leave.senders'
])
/** lists whose items are suggested from the monitored groups */
export const SUGGEST_TARGETS = new Set(['recoveryIgnoreTargets', 'vision.leave.groups'])
export const WIDE_TEXT = new Set(['zaloExePath', 'dataDir', 'statusExportDir'])
export const ENUMS: Record<string, readonly string[]> = {
  'vision.leave.dateFormat': ['MDY', 'DMY'],
  'vision.reader': ['openrouter']
}

/** report codes a person can receive, in display order */
export const REPORT_CODES = [
  'netsupport',
  'loa',
  'internet',
  'mayTinh',
  'dien',
  'cleaning',
  'attendance',
  'leave',
  'maintenance',
  'internetSpeed',
  'minutes',
  'attendanceStart',
  'attendanceEnd',
  'shiftStart',
  'shiftEnd'
] as const

/** `base` is the value from the real config, used to tell booleans, numbers and text apart */
export function kindOf(path: string, base: unknown): SettingKind {
  if (TIME_PATHS.has(path)) return 'time'
  if (ENUMS[path]) return 'enum'
  if (LIST_PATHS.has(path)) return 'list'
  if (path === 'reportSets') return 'sets'
  if (path === 'groupAliases') return 'aliases'
  if (path === 'scrollDelayMs') return 'range'
  if (WIDE_TEXT.has(path)) return 'text'
  if (typeof base === 'boolean') return 'bool'
  if (typeof base === 'number') return 'number'
  if (typeof base === 'string') return 'text'
  return 'json'
}

export const isStacked = (k: SettingKind): boolean =>
  k === 'list' || k === 'sets' || k === 'aliases' || k === 'json'
