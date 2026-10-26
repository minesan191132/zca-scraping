import { describe, expect, it } from 'vitest'
import type { ConfigDump, ConfigSetting } from '@shared/ipc'
import {
  flattenConfig,
  mergeOverlay,
  overlayToConfigJson,
  validateOverlay
} from '../src/main/config-json'

const setting = (path: string, value: unknown): ConfigSetting => ({
  section: 's',
  path,
  unit: '',
  default: null,
  hasDefault: false,
  defaultLabel: null,
  readers: [],
  note: '',
  value
})

const dump: ConfigDump = {
  sections: ['s'],
  settings: [
    setting('cdpPort', 9222),
    setting('vision.leave.groups', ['a']),
    setting('runner.quietSeconds', 30),
    setting('zaloExePath', null)
  ]
}

describe('overlayToConfigJson', () => {
  it('nests the flat paths', () => {
    expect(overlayToConfigJson({ 'vision.leave.groups': ['g'], cdpPort: 9333 })).toEqual({
      vision: { leave: { groups: ['g'] } },
      cdpPort: 9333
    })
  })
})

describe('validateOverlay', () => {
  it('accepts known keys of the right kind', () => {
    expect(validateOverlay({ cdpPort: 9333, 'vision.leave.groups': ['g'] }, dump)).toEqual([])
  })
  it('names an unknown key', () => {
    const errors = validateOverlay({ 'no.such.key': 1 }, dump)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('no.such.key')
  })
  it('names a key of the wrong kind', () => {
    const errors = validateOverlay({ cdpPort: '9333', 'vision.leave.groups': 'g' }, dump)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('cdpPort')
    expect(errors[1]).toContain('vision.leave.groups')
  })
  it('does not check the kind when the current value is null', () => {
    expect(validateOverlay({ zaloExePath: 'C:/x.exe' }, dump)).toEqual([])
  })
})

describe('mergeOverlay', () => {
  it('keeps keys the overlay does not mention and replaces arrays whole', () => {
    const existing = {
      groupAliases: { a: 'b' },
      vision: { leave: { groups: ['old1', 'old2'], other: 1 } },
      cdpPort: 1
    }
    const out = mergeOverlay(existing, { 'vision.leave.groups': ['new'], cdpPort: 2 })
    expect(out).toEqual({
      groupAliases: { a: 'b' },
      vision: { leave: { groups: ['new'], other: 1 } },
      cdpPort: 2
    })
    expect(existing.cdpPort).toBe(1)
  })
  it('null removes the key', () => {
    expect(mergeOverlay({ cdpPort: 1, runner: { quietSeconds: 5 } }, { cdpPort: null })).toEqual({
      runner: { quietSeconds: 5 }
    })
  })
})

describe('flattenConfig', () => {
  it('turns config.json into overlay paths, only for keys present', () => {
    expect(
      flattenConfig({ cdpPort: 1, vision: { leave: { groups: ['x'] } }, groupAliases: {} }, dump)
    ).toEqual({ cdpPort: 1, 'vision.leave.groups': ['x'] })
  })
})
