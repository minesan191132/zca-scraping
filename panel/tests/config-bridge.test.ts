import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ConfigDump, ConfigSetting } from '@shared/ipc'
import { SOURCE_MODE, type Mode, type RunResult, type Runner } from '../src/main/command'
import { ConfigBridge } from '../src/main/config-bridge'

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
  settings: [setting('cdpPort', 9222), setting('vision.leave.groups', ['a'])]
}
const dumpOut = (extraErr = ''): RunResult => ({
  code: 0,
  stdout: '@@JSON@@' + JSON.stringify(dump) + '\n',
  stderr: extraErr
})

let root: string
let mode: Mode
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'bridge-test-'))
  mode = {
    bundled: true,
    resources: join(root, 'res'),
    home: join(root, 'home'),
    execPath: 'e.exe'
  }
})

describe('ConfigBridge, bundled mode', () => {
  it('save writes a nested config.json, keeps hand-edited keys, and returns the bot warnings', async () => {
    mkdirSync(mode.home, { recursive: true })
    const file = join(mode.home, 'config.json')
    writeFileSync(file, JSON.stringify({ groupAliases: { x: 'y' }, cdpPort: 1 }))
    const run: Runner = async () => dumpOut('[config] canh bao 1\nnoise\n[config] canh bao 2')
    const bridge = new ConfigBridge(root, () => mode, run)
    const r = await bridge.save({ 'vision.leave.groups': ['g'], cdpPort: 9333 })
    expect(r).toEqual({
      ok: true,
      file,
      warnings: ['[config] canh bao 1', '[config] canh bao 2']
    })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({
      groupAliases: { x: 'y' },
      cdpPort: 9333,
      vision: { leave: { groups: ['g'] } }
    })
    expect(existsSync(file + '.tmp')).toBe(false)
  })

  it('save writes nothing when the overlay has errors', async () => {
    const bridge = new ConfigBridge(
      root,
      () => mode,
      async () => dumpOut()
    )
    const r = await bridge.save({ nope: 1, cdpPort: 'x' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toHaveLength(2)
    expect(existsSync(join(mode.home, 'config.json'))).toBe(false)
  })

  it('save puts the old file back when the bot refuses the new one', async () => {
    mkdirSync(mode.home, { recursive: true })
    const file = join(mode.home, 'config.json')
    writeFileSync(file, '{"cdpPort":1}')
    let calls = 0
    const run: Runner = async () =>
      ++calls === 1 ? dumpOut() : { code: 1, stdout: '', stderr: 'config.json: cdpPort sai' }
    const bridge = new ConfigBridge(root, () => mode, run)
    const r = await bridge.save({ cdpPort: 5 })
    expect(r).toEqual({ ok: false, errors: ['config.json: cdpPort sai'] })
    expect(readFileSync(file, 'utf8')).toBe('{"cdpPort":1}')
  })

  it('load flattens config.json into the overlay', async () => {
    mkdirSync(mode.home, { recursive: true })
    writeFileSync(
      join(mode.home, 'config.json'),
      JSON.stringify({ vision: { leave: { groups: ['z'] } } })
    )
    const bridge = new ConfigBridge(
      root,
      () => mode,
      async () => dumpOut()
    )
    const r = await bridge.load(mode.resources, true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.overlay).toEqual({ 'vision.leave.groups': ['z'] })
  })

  it('load shows the bot error line when config.json is broken', async () => {
    const run: Runner = async () => ({
      code: 1,
      stdout: '',
      stderr: 'C:\\x\\config.json: JSON hỏng ở dòng 3\n'
    })
    const bridge = new ConfigBridge(root, () => mode, run)
    const r = await bridge.load(mode.resources, true)
    expect(r).toEqual({
      ok: false,
      code: 'failed',
      error: 'C:\\x\\config.json: JSON hỏng ở dòng 3'
    })
  })
})

describe('ConfigBridge, source mode', () => {
  it('still saves settings.draft.json and never runs a command on save', async () => {
    let ran = 0
    const run: Runner = async () => {
      ran++
      return dumpOut()
    }
    const bridge = new ConfigBridge(root, () => SOURCE_MODE, run)
    const r = await bridge.save({ cdpPort: 1 })
    expect(r).toEqual({ ok: true, file: join(root, 'settings.draft.json'), warnings: [] })
    expect(JSON.parse(readFileSync(join(root, 'settings.draft.json'), 'utf8'))).toEqual({
      cdpPort: 1
    })
    expect(ran).toBe(0)
  })

  it('load reads the draft as the overlay', async () => {
    writeFileSync(join(root, 'settings.draft.json'), '{"cdpPort":7}')
    const bridge = new ConfigBridge(
      root,
      () => SOURCE_MODE,
      async () => dumpOut()
    )
    const r = await bridge.load(root, true)
    expect(r.ok && r.overlay).toEqual({ cdpPort: 7 })
  })
})
