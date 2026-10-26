import { describe, expect, it } from 'vitest'
import type { ConfigSetting } from '@shared/ipc'
import { validateDraft } from '@shared/validation'

const setting = (path: string, unit = ''): ConfigSetting => ({
  section: '',
  path,
  unit,
  default: null,
  hasDefault: false,
  defaultLabel: null,
  readers: [],
  note: '',
  value: null
})

const check = (
  draft: Record<string, unknown>,
  base: Record<string, unknown> = draft,
  jsonBad: string[] = []
): ReturnType<typeof validateDraft> =>
  validateDraft(
    Object.keys(draft).map((p) => setting(p)),
    base,
    draft,
    new Set(jsonBad)
  )

describe('validateDraft', () => {
  it('accepts a sane draft', () => {
    expect(
      check({
        cdpPort: 9222,
        'watch.heartbeatSeconds': 15,
        'watch.deadAfterSeconds': 90,
        targets: ['A']
      })
    ).toEqual({})
  })

  it('checks numbers', () => {
    expect(check({ targetMessageCount: 2000 })).toEqual({})
    expect(
      check({ targetMessageCount: null }, { targetMessageCount: 2000 }).targetMessageCount.key
    ).toBe('err.number')
    expect(
      check({ targetMessageCount: -1 }, { targetMessageCount: 2000 }).targetMessageCount.key
    ).toBe('err.negative')
  })

  it('limits hour settings to 24', () => {
    const draft = { 'phases.x': 25 }
    expect(validateDraft([setting('phases.x', 'giờ')], draft, draft)['phases.x'].key).toBe(
      'err.hours'
    )
  })

  it('checks the debug port range', () => {
    expect(check({ cdpPort: 0 }).cdpPort.key).toBe('err.port')
    expect(check({ cdpPort: 70000 }).cdpPort.key).toBe('err.port')
    expect(check({ cdpPort: 9222.5 }).cdpPort.key).toBe('err.port')
  })

  it('keeps the maximum column width between 10 and 255', () => {
    expect(check({ excelMaxColumnWidth: 50 })).toEqual({})
    expect(check({ excelMaxColumnWidth: 9 }).excelMaxColumnWidth.key).toBe('err.colWidth')
    expect(check({ excelMaxColumnWidth: 256 }).excelMaxColumnWidth.key).toBe('err.colWidth')
  })

  it('wants an absolute export folder', () => {
    const base = { statusExportDir: 'D:\\x' }
    expect(check({ statusExportDir: 'data/export' }, base).statusExportDir.key).toBe('err.absPath')
    expect(check({ statusExportDir: 'D:\\BaoCao' }, base)).toEqual({})
    expect(check({ statusExportDir: '\\\\server\\share' }, base)).toEqual({})
  })

  it('lets zaloExePath stay empty but nothing else', () => {
    expect(check({ zaloExePath: '' }, { zaloExePath: 'C:\\Zalo.exe' })).toEqual({})
    expect(check({ dataDir: '  ' }, { dataDir: 'D:\\data' }).dataDir.key).toBe('err.empty')
  })

  it('wants the dead-after time to be at least twice the heartbeat', () => {
    expect(
      check({ 'watch.heartbeatSeconds': 30, 'watch.deadAfterSeconds': 59 })[
        'watch.deadAfterSeconds'
      ].key
    ).toBe('err.deadAfter')
    expect(check({ 'watch.heartbeatSeconds': 30, 'watch.deadAfterSeconds': 60 })).toEqual({})
  })

  it('wants the leave settle time below the runner quiet time', () => {
    expect(
      check({ 'vision.leave.settleSeconds': 30, 'runner.quietSeconds': 30 })[
        'vision.leave.settleSeconds'
      ].key
    ).toBe('err.settle')
    expect(check({ 'vision.leave.settleSeconds': 20, 'runner.quietSeconds': 30 })).toEqual({})
  })

  it('checks the scroll delay range', () => {
    expect(check({ scrollDelayMs: { min: 900, max: 500 } }).scrollDelayMs.key).toBe(
      'err.rangeOrder'
    )
    expect(check({ scrollDelayMs: { min: -1, max: 500 } }).scrollDelayMs.key).toBe('err.range2')
    expect(check({ scrollDelayMs: { min: 500, max: 1200 } })).toEqual({})
  })

  it('keeps ignore lists and aliases inside the monitored groups', () => {
    expect(check({ targets: ['A', 'A'] }).targets.key).toBe('err.dupGroup')
    expect(check({ targets: ['A'], recoveryIgnoreTargets: ['B'] }).recoveryIgnoreTargets.key).toBe(
      'err.notInTargets'
    )
    expect(check({ targets: ['A'], groupAliases: { B: 'A' } }).groupAliases.key).toBe(
      'err.aliasNotInTargets'
    )
    expect(
      check({ targets: ['A'], recoveryIgnoreTargets: ['A'], groupAliases: { A: 'x' } })
    ).toEqual({})
  })

  it('checks the people', () => {
    const sets = (...ids: string[]): Record<string, unknown> => ({
      reportSets: ids.map((id) => ({ id, reports: [] }))
    })
    expect(check(sets('')).reportSets.key).toBe('err.personEmpty')
    expect(check(sets('NguoiA', 'NguoiA')).reportSets.key).toBe('err.personDup')
    expect(check(sets('a/b')).reportSets.key).toBe('err.personChars')
    expect(check(sets('NguoiA', 'NguoiB'))).toEqual({})
  })

  it('reports invalid JSON text', () => {
    expect(check({ weird: { a: 1 } }, { weird: { a: 1 } }, ['weird']).weird.key).toBe('err.json')
  })
})
