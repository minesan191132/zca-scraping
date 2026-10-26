import { describe, expect, it } from 'vitest'
import source from './fixtures/settings-source.json'
import { pathsFor, placementOf } from '@shared/settings-map'

const paths = (source as { path: string }[]).map((s) => s.path)

describe('settings-map', () => {
  it('has the 72 settings of the real config, each with a distinct path', () => {
    expect(paths).toHaveLength(72)
    expect(new Set(paths).size).toBe(72)
  })

  it('places every setting on exactly one page', () => {
    for (const p of paths) expect(() => placementOf(p)).not.toThrow()
    const counts = {
      watch: pathsFor(paths, 'watch').length,
      runner: pathsFor(paths, 'runner').length,
      chat: pathsFor(paths, 'chat').length,
      total: pathsFor(paths, 'total').length,
      general: pathsFor(paths, 'general').length
    }
    expect(counts).toEqual({ watch: 6, runner: 17, chat: 6, total: 11, general: 32 })
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(72)
  })

  it('splits the general page into its four tabs', () => {
    expect(pathsFor(paths, 'general', 'zalo')).toHaveLength(6)
    expect(pathsFor(paths, 'general', 'groups')).toHaveLength(4)
    expect(pathsFor(paths, 'general', 'scrape')).toHaveLength(4)
    expect(pathsFor(paths, 'general', 'vision')).toHaveLength(18)
  })

  it('keeps a key read by several bots on the page of its prefix', () => {
    expect(placementOf('watch.heartbeatSeconds').page).toBe('watch')
    expect(placementOf('recovery.marginMinutes')).toEqual({ page: 'runner', group: 'recovery' })
    expect(placementOf('print.enabled')).toEqual({ page: 'total', group: 'print' })
  })

  it('places the technical report times on the runner page', () => {
    for (const k of ['attendanceStartUntil', 'attendanceEndUntil', 'shiftStartUntil', 'shiftEndUntil']) {
      expect(placementOf(`techReports.${k}`)).toEqual({ page: 'runner', group: 'techReports' })
    }
  })

  it('fails loudly on a new key nobody placed', () => {
    expect(() => placementOf('brandNewKey')).toThrow(/no page/)
  })
})
