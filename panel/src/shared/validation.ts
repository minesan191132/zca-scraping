import type { ConfigSetting } from './ipc'
import { kindOf } from './setting-kinds'

export interface FieldError {
  /** key in the i18n dictionary, "err.*" */
  key: string
}

export interface ReportSet {
  id: string
  reports: string[]
  /** printed in the "reporter" cell of the technical sheets; kept as is when the panel edits a person */
  reporterName?: string
}

type Draft = Record<string, unknown>

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

/**
 * Checks a draft of the config. Returns the first error of each setting, keyed by path.
 * `base` holds the values of the real config (used to know each setting's type), `jsonBad` the paths whose JSON text does not parse.
 */
export function validateDraft(
  settings: readonly ConfigSetting[],
  base: Draft,
  draft: Draft,
  jsonBad: ReadonlySet<string> = new Set()
): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {}
  const bad = (path: string, key: string): void => {
    if (!errors[path]) errors[path] = { key }
  }

  for (const s of settings) {
    const kind = kindOf(s.path, base[s.path])
    const v = draft[s.path]
    if (jsonBad.has(s.path)) bad(s.path, 'err.json')
    if (kind === 'number') {
      if (!isNum(v)) bad(s.path, 'err.number')
      else if (v < 0) bad(s.path, 'err.negative')
      else if (s.unit === 'giờ' && v > 24) bad(s.path, 'err.hours')
    }
    if (kind === 'text' && typeof v === 'string' && !v.trim() && s.path !== 'zaloExePath')
      bad(s.path, 'err.empty')
    if (kind === 'range' && v) {
      const r = v as { min?: unknown; max?: unknown }
      if (![r.min, r.max].every((x) => isNum(x) && x >= 0)) bad(s.path, 'err.range2')
      else if ((r.min as number) > (r.max as number)) bad(s.path, 'err.rangeOrder')
    }
  }

  const port = draft.cdpPort
  if (isNum(port) && (!Number.isInteger(port) || port < 1 || port > 65535))
    bad('cdpPort', 'err.port')

  const exportDir = draft.statusExportDir
  if (
    typeof exportDir === 'string' &&
    exportDir.trim() &&
    !/^([A-Za-z]:[\\/]|\\\\)/.test(exportDir)
  )
    bad('statusExportDir', 'err.absPath')

  const colWidth = draft.excelMaxColumnWidth
  if (isNum(colWidth) && (colWidth < 10 || colWidth > 255))
    bad('excelMaxColumnWidth', 'err.colWidth')

  const beat = draft['watch.heartbeatSeconds']
  const dead = draft['watch.deadAfterSeconds']
  if (isNum(beat) && isNum(dead) && dead < 2 * beat) bad('watch.deadAfterSeconds', 'err.deadAfter')

  const settle = draft['vision.leave.settleSeconds']
  const quiet = draft['runner.quietSeconds']
  if (isNum(settle) && isNum(quiet) && settle >= quiet)
    bad('vision.leave.settleSeconds', 'err.settle')

  const targets = (draft.targets as string[] | undefined) ?? []
  if (new Set(targets).size !== targets.length) bad('targets', 'err.dupGroup')
  if (
    ((draft.recoveryIgnoreTargets as string[] | undefined) ?? []).some((t) => !targets.includes(t))
  )
    bad('recoveryIgnoreTargets', 'err.notInTargets')
  if (
    Object.keys((draft.groupAliases as Record<string, string> | undefined) ?? {}).some(
      (t) => !targets.includes(t)
    )
  )
    bad('groupAliases', 'err.aliasNotInTargets')

  const sets = (draft.reportSets as ReportSet[] | undefined) ?? []
  const ids = sets.map((x) => (x.id || '').trim())
  if (ids.some((x) => !x)) bad('reportSets', 'err.personEmpty')
  else if (new Set(ids).size !== ids.length) bad('reportSets', 'err.personDup')
  else if (ids.some((x) => /[\\/:*?"<>|]/.test(x))) bad('reportSets', 'err.personChars')

  return errors
}
