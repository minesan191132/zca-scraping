import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scriptCommand, SOURCE_MODE, stepCommand, type Mode } from '../src/main/command'

const bs = String.fromCharCode(92)
const winPath = (...parts: string[]): string => parts.join(bs)
const resources = winPath('C:', 'Program Files', 'Bao Cao Nhom', 'resources')
const bundled: Mode = {
  bundled: true,
  resources,
  home: winPath('C:', 'Users', 'A B', 'AppData', 'Local', 'BaoCaoNhom'),
  execPath: winPath('C:', 'Program Files', 'Bao Cao Nhom', 'bao-cao-nhom.exe')
}

describe('scriptCommand', () => {
  it('source mode keeps cmd.exe /c npm run -s', () => {
    expect(scriptCommand('bot:watch', SOURCE_MODE)).toEqual({
      command: 'cmd.exe',
      args: ['/c', 'npm', 'run', '-s', 'bot:watch'],
      env: {}
    })
  })

  it('bundled mode runs the dist file with Electron as Node, path in ONE arg', () => {
    const c = scriptCommand('bot:watch', bundled)!
    expect(c.command).toBe(bundled.execPath)
    expect(c.args).toEqual([join(resources, 'dist', 'cli', 'bot-watch-core.js')])
    expect(Object.keys(c.env).sort()).toEqual(
      ['ELECTRON_RUN_AS_NODE', 'ZBOT_BUNDLED', 'ZBOT_CODE_ROOT', 'ZBOT_HOME'].sort()
    )
    expect(c.env.ZBOT_HOME).toBe(bundled.home)
    expect(c.env.ELECTRON_RUN_AS_NODE).toBe('1')
  })

  it('scripts outside the bundle give null', () => {
    for (const s of ['bot:chat', 'bot:total', 'today', 'total:once', 'chat:status', 'total:status'])
      expect(scriptCommand(s, bundled)).toBeNull()
  })

  it('maps the status commands to the merged CLIs', () => {
    expect(scriptCommand('runner:status', bundled)!.args[0]).toMatch(/dispatch-status\.js$/)
    expect(scriptCommand('watch:status', bundled)!.args[0]).toMatch(/watch-status-core\.js$/)
    expect(scriptCommand('license:info', bundled)!.args[0]).toMatch(/license-info\.js$/)
  })

  it('extra args go after -- in source mode and straight on in bundled mode', () => {
    expect(scriptCommand('x', SOURCE_MODE, ['--a'])!.args.slice(-2)).toEqual(['--', '--a'])
    expect(scriptCommand('config:dump', bundled, ['--a'])!.args.slice(1)).toEqual(['--a'])
  })
})

describe('stepCommand', () => {
  it('source mode keeps cmd.exe /c npm -s <step>', () => {
    expect(stepCommand(['run', 'today', '--', '--set', 'A'], SOURCE_MODE)).toEqual({
      command: 'cmd.exe',
      args: ['/c', 'npm', '-s', 'run', 'today', '--', '--set', 'A'],
      env: {}
    })
  })

  it('bundled mode has no today / total:once', () => {
    expect(stepCommand(['run', 'today'], bundled)).toBeNull()
    expect(stepCommand(['run', 'total:once', '--', '--slot', 'morning'], bundled)).toBeNull()
  })

  it('bundled mode passes the args after -- for a script in the bundle', () => {
    expect(stepCommand(['run', 'bot:scrape', '--', '--x'], bundled)!.args.slice(1)).toEqual(['--x'])
  })
})
