import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { SOURCE_MODE, type Mode, type Runner } from '../src/main/command'
import { LicenseService, parseLicenseInfo } from '../src/main/license'

let root: string
let mode: Mode
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'lic-test-'))
  mode = {
    bundled: true,
    resources: join(root, 'res'),
    home: join(root, 'home'),
    execPath: 'e.exe'
  }
})

const fake =
  (info: object): Runner =>
  async () => ({ code: 0, stdout: '@@JSON@@' + JSON.stringify(info) + '\n', stderr: '' })

describe('LicenseService.get', () => {
  const states = [
    'ok',
    'missing',
    'bad-format',
    'bad-signature',
    'wrong-machine',
    'machine-unreadable',
    'expired'
  ]
  for (const state of states) {
    it(`maps the license-info output for ${state}`, async () => {
      const info = {
        state,
        customer: state === 'ok' ? 'Truong A' : null,
        expiresAt: state === 'ok' ? '2027-01-01T00:00:00.000Z' : null,
        machineId: 'abc'
      }
      expect(await new LicenseService(() => mode, fake(info)).get()).toEqual(info)
    })
  }

  it('runs the license-info CLI through Electron as Node', async () => {
    let seen: { args: string[]; env: Record<string, string> } | null = null
    const run: Runner = async (cmd) => {
      seen = cmd
      return { code: 0, stdout: '@@JSON@@{"state":"missing"}', stderr: '' }
    }
    await new LicenseService(() => mode, run).get()
    expect(seen!.args[0]).toMatch(/license-info\.js$/)
    expect(seen!.env.ELECTRON_RUN_AS_NODE).toBe('1')
  })

  it('throws on output without the marker or with an unknown state', async () => {
    const noMarker: Runner = async () => ({ code: 1, stdout: '', stderr: 'boom' })
    await expect(new LicenseService(() => mode, noMarker).get()).rejects.toThrow('boom')
    expect(() => parseLicenseInfo('@@JSON@@{"state":"weird"}')).toThrow()
  })

  it('source mode is never blocked and runs nothing', async () => {
    const run: Runner = async () => {
      throw new Error('must not run')
    }
    const r = await new LicenseService(() => SOURCE_MODE, run).get()
    expect(r.state).toBe('ok')
  })
})

describe('LicenseService.import', () => {
  const okInfo = {
    state: 'ok',
    customer: 'A',
    expiresAt: '2027-01-01T00:00:00.000Z',
    machineId: 'm'
  }

  it('copies a valid-looking file into <home>/license.json and re-reads the state', async () => {
    const src = join(root, 'chosen.json')
    const body = JSON.stringify({ payload: '{"customer":"A"}', sig: 'AAAA' })
    writeFileSync(src, body)
    const r = await new LicenseService(() => mode, fake(okInfo)).import(src)
    expect(r.state).toBe('ok')
    expect(readFileSync(join(mode.home, 'license.json'), 'utf8')).toBe(body)
    expect(existsSync(join(mode.home, 'license.json.tmp'))).toBe(false)
  })

  it('does not overwrite the current license when the source cannot be read', async () => {
    const svc = new LicenseService(() => mode, fake(okInfo))
    const good = join(root, 'good.json')
    writeFileSync(good, JSON.stringify({ payload: 'p', sig: 's' }))
    await svc.import(good)
    const before = readFileSync(join(mode.home, 'license.json'), 'utf8')
    await expect(svc.import(join(root, 'missing.json'))).rejects.toThrow()
    expect(readFileSync(join(mode.home, 'license.json'), 'utf8')).toBe(before)
  })

  it('does not overwrite the current license with a file that is not a license', async () => {
    const svc = new LicenseService(() => mode, fake(okInfo))
    const good = join(root, 'good.json')
    writeFileSync(good, JSON.stringify({ payload: 'p', sig: 's' }))
    await svc.import(good)
    const bad = join(root, 'bad.json')
    writeFileSync(bad, '{"hello":1}')
    await expect(svc.import(bad)).rejects.toThrow()
    expect(JSON.parse(readFileSync(join(mode.home, 'license.json'), 'utf8')).payload).toBe('p')
  })

  it('keeps the working license when the new file is rejected (bad signature, wrong machine, expired)', async () => {
    let state = 'ok'
    const run: Runner = async () => ({
      code: 0,
      stdout: '@@JSON@@' + JSON.stringify({ ...okInfo, state }) + '\n',
      stderr: ''
    })
    const svc = new LicenseService(() => mode, run)
    const good = join(root, 'good.json')
    writeFileSync(good, JSON.stringify({ payload: 'good', sig: 's' }))
    await svc.import(good)
    const goodBody = readFileSync(join(mode.home, 'license.json'), 'utf8')

    for (const rejected of ['bad-signature', 'wrong-machine', 'expired']) {
      state = rejected
      const next = join(root, `${rejected}.json`)
      writeFileSync(next, JSON.stringify({ payload: rejected, sig: 's' }))
      await expect(svc.import(next)).rejects.toThrow(`license-rejected:${rejected}`)
      expect(readFileSync(join(mode.home, 'license.json'), 'utf8')).toBe(goodBody)
      expect(existsSync(join(mode.home, 'license.json.bak'))).toBe(false)
      expect(existsSync(join(mode.home, 'license.json.tmp'))).toBe(false)
    }
  })

  it('leaves no license behind when the first file ever imported is rejected', async () => {
    const run: Runner = async () => ({
      code: 0,
      stdout: '@@JSON@@' + JSON.stringify({ ...okInfo, state: 'bad-signature' }),
      stderr: ''
    })
    const svc = new LicenseService(() => mode, run)
    const src = join(root, 'first.json')
    writeFileSync(src, JSON.stringify({ payload: 'p', sig: 's' }))
    await expect(svc.import(src)).rejects.toThrow('license-rejected:bad-signature')
    expect(existsSync(join(mode.home, 'license.json'))).toBe(false)
  })

  it('restores the working license when the license-info command itself fails', async () => {
    let fail = false
    const run: Runner = async () =>
      fail
        ? { code: 1, stdout: '', stderr: 'boom' }
        : { code: 0, stdout: '@@JSON@@' + JSON.stringify(okInfo), stderr: '' }
    const svc = new LicenseService(() => mode, run)
    const good = join(root, 'good.json')
    writeFileSync(good, JSON.stringify({ payload: 'good', sig: 's' }))
    await svc.import(good)
    fail = true
    const next = join(root, 'next.json')
    writeFileSync(next, JSON.stringify({ payload: 'next', sig: 's' }))
    await expect(svc.import(next)).rejects.toThrow('boom')
    expect(JSON.parse(readFileSync(join(mode.home, 'license.json'), 'utf8')).payload).toBe('good')
  })
})
