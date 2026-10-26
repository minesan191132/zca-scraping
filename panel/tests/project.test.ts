import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { REQUIRED_SCRIPTS } from '@shared/bots'
import { parseConfigDump } from '../src/main/config-bridge'
import type { Mode } from '../src/main/command'
import {
  bundledProject,
  findProjectFrom,
  inspectProject,
  ProjectStore,
  readDefaultProject
} from '../src/main/project'

let root: string
const saved = process.env.ZCA_PROJECT_DIR

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'panel-test-'))
  delete process.env.ZCA_PROJECT_DIR
})
afterEach(() => {
  if (saved === undefined) delete process.env.ZCA_PROJECT_DIR
  else process.env.ZCA_PROJECT_DIR = saved
})

function makeProject(name: string, scripts: string[]): string {
  const dir = join(root, name)
  mkdirSync(dir)
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ scripts: Object.fromEntries(scripts.map((s) => [s, 'x'])) })
  )
  return dir
}

describe('inspectProject', () => {
  it('accepts a folder with every required script and config:dump', () => {
    const dir = makeProject('full', [...REQUIRED_SCRIPTS, 'config:dump'])
    expect(inspectProject(dir)).toEqual({ valid: true, missing: [], configReady: true })
  })

  it('names each missing script, and config:dump alone does not block the bot pages', () => {
    const dir = makeProject(
      'old',
      REQUIRED_SCRIPTS.filter((s) => s !== 'watch:status')
    )
    expect(inspectProject(dir)).toEqual({
      valid: true,
      missing: ['watch:status'],
      configReady: false
    })
    const noConfig = makeProject('no-config', [...REQUIRED_SCRIPTS])
    expect(inspectProject(noConfig)).toMatchObject({ missing: [], configReady: false })
  })

  it('rejects a folder without package.json', () => {
    const dir = join(root, 'empty')
    mkdirSync(dir)
    expect(inspectProject(dir).valid).toBe(false)
  })
})

describe('ProjectStore', () => {
  it('starts with no project and remembers a valid choice across restarts', () => {
    const data = join(root, 'userdata')
    mkdirSync(data)
    const project = makeProject('bot', [...REQUIRED_SCRIPTS])
    const first = new ProjectStore(data)
    expect(first.info().dir).toBeNull()
    first.choose(project)
    expect(new ProjectStore(data).info().dir).toBe(project)
  })

  it('does not save a folder that lacks required scripts', () => {
    const data = join(root, 'userdata')
    mkdirSync(data)
    const store = new ProjectStore(data)
    const result = store.choose(makeProject('bad', ['bot:watch']))
    expect(result.missing.length).toBeGreaterThan(0)
    expect(store.info().dir).toBeNull()
  })

  it('uses the development fallback only when nothing else is set', () => {
    const data = join(root, 'userdata')
    mkdirSync(data)
    const dev = makeProject('dev', [...REQUIRED_SCRIPTS])
    expect(new ProjectStore(data, { starts: [dev], defaultFile: null }).info().dir).toBe(dev)
    const chosen = makeProject('chosen', [...REQUIRED_SCRIPTS])
    const store = new ProjectStore(data, { starts: [dev], defaultFile: null })
    store.choose(chosen)
    expect(store.info().dir).toBe(chosen)
  })

  it('lets ZCA_PROJECT_DIR win over everything', () => {
    const data = join(root, 'userdata')
    mkdirSync(data)
    const fromEnv = makeProject('env', [...REQUIRED_SCRIPTS])
    const store = new ProjectStore(data, {
      starts: [makeProject('dev', [...REQUIRED_SCRIPTS])],
      defaultFile: null
    })
    process.env.ZCA_PROJECT_DIR = fromEnv
    expect(store.info().dir).toBe(fromEnv)
  })

  it('writes the saved folder as readable JSON', () => {
    const data = join(root, 'userdata')
    mkdirSync(data)
    const project = makeProject('bot', [...REQUIRED_SCRIPTS])
    new ProjectStore(data).choose(project)
    expect(JSON.parse(readFileSync(join(data, 'project.json'), 'utf8'))).toEqual({ dir: project })
  })
})

describe('parseConfigDump', () => {
  const dump = { sections: ['1. ZALO'], settings: [] }

  it('finds the JSON after the marker even with other output before it', () => {
    expect(parseConfigDump(`some noise\n@@JSON@@${JSON.stringify(dump)}\n`)).toEqual(dump)
  })

  it('reports the output when the marker is missing', () => {
    expect(parseConfigDump('npm error missing script')).toEqual({
      error: 'npm error missing script'
    })
  })

  it('reports invalid JSON', () => {
    expect('error' in parseConfigDump('@@JSON@@{nope')).toBe(true)
    expect('error' in parseConfigDump('@@JSON@@{"a":1}')).toBe(true)
  })
})

describe('findProjectFrom', () => {
  /** a folder that looks like the bot project (has every required script) */
  const bot = (dir: string): string => {
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ scripts: Object.fromEntries(REQUIRED_SCRIPTS.map((s) => [s, 'x'])) })
    )
    return dir
  }
  /** a folder with a package.json that is not the bot, like the panel's own */
  const other = (dir: string): string => {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'x' } }))
    return dir
  }

  it('finds the project above a panel built inside it, skipping the panel own package.json', () => {
    const project = bot(join(root, 'repo'))
    other(join(root, 'repo', 'panel'))
    const exeDir = join(root, 'repo', 'panel', 'dist', 'win-unpacked')
    mkdirSync(exeDir, { recursive: true })
    expect(findProjectFrom([exeDir])).toBe(project)
  })

  it('finds a project that sits next to the panel (the old layout)', () => {
    const project = bot(join(root, 'work', 'zca-scrape-message'))
    const exeDir = join(root, 'work', 'zca-operations-panel', 'dist', 'win-unpacked')
    mkdirSync(exeDir, { recursive: true })
    expect(findProjectFrom([exeDir])).toBe(project)
  })

  it('tries the starting points in order', () => {
    const first = bot(join(root, 'a', 'zca-scrape-message'))
    bot(join(root, 'b', 'zca-scrape-message'))
    mkdirSync(join(root, 'a', 'x'), { recursive: true })
    mkdirSync(join(root, 'b', 'x'), { recursive: true })
    expect(findProjectFrom([join(root, 'a', 'x'), join(root, 'b', 'x')])).toBe(first)
  })

  it('returns null when nothing around the app looks like the project', () => {
    other(join(root, 'lonely', 'panel'))
    mkdirSync(join(root, 'lonely', 'panel', 'dist'), { recursive: true })
    expect(findProjectFrom([join(root, 'lonely', 'panel', 'dist')])).toBeNull()
    expect(findProjectFrom([])).toBeNull()
  })
})

describe('readDefaultProject and the order of ProjectStore', () => {
  const write = (file: string, content: unknown): string => {
    writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content))
    return file
  }

  it('uses the folder recorded at build time only while it still fits', () => {
    const project = makeProject('recorded', [...REQUIRED_SCRIPTS])
    expect(readDefaultProject(write(join(root, 'ok.json'), { dir: project }))).toBe(project)
    expect(
      readDefaultProject(write(join(root, 'gone.json'), { dir: join(root, 'missing') }))
    ).toBeNull()
    expect(readDefaultProject(write(join(root, 'null.json'), { dir: null }))).toBeNull()
    expect(readDefaultProject(write(join(root, 'bad.json'), '{nope'))).toBeNull()
    expect(readDefaultProject(null)).toBeNull()
  })

  it('asks for nothing when the search or the recorded folder finds the project, and prefers a saved choice', () => {
    const data = join(root, 'userdata')
    mkdirSync(data)
    const recorded = makeProject('recorded', [...REQUIRED_SCRIPTS])
    const file = write(join(root, 'default.json'), { dir: recorded })
    expect(new ProjectStore(data, { starts: [], defaultFile: file }).info().dir).toBe(recorded)

    const chosen = makeProject('chosen', [...REQUIRED_SCRIPTS])
    const store = new ProjectStore(data, { starts: [], defaultFile: file })
    store.choose(chosen)
    expect(store.info().dir).toBe(chosen)
  })

  it('still asks when the recorded folder is gone and nothing else is found', () => {
    const data = join(root, 'userdata')
    mkdirSync(data)
    const file = write(join(root, 'stale.json'), { dir: join(root, 'moved-away') })
    expect(
      new ProjectStore(data, { starts: [join(root, 'nowhere')], defaultFile: file }).info().dir
    ).toBeNull()
  })
})

describe('bundled mode', () => {
  const mode = (resources: string): Mode => ({
    bundled: true,
    resources,
    home: join(root, 'home'),
    execPath: 'electron.exe'
  })

  it('bundledProject: configReady follows dist/cli/config-dump.js, missing is always empty', () => {
    const res = join(root, 'resources')
    mkdirSync(join(res, 'dist', 'cli'), { recursive: true })
    expect(bundledProject(res)).toEqual({ dir: res, missing: [], configReady: false })
    writeFileSync(join(res, 'dist', 'cli', 'config-dump.js'), '')
    expect(bundledProject(res)).toEqual({ dir: res, missing: [], configReady: true })
  })

  it('ProjectStore in bundled mode needs no project folder and saves no choice', () => {
    const res = join(root, 'resources2')
    mkdirSync(res)
    const userData = join(root, 'ud')
    mkdirSync(userData)
    const store = new ProjectStore(userData, { starts: [], defaultFile: null }, () => mode(res))
    expect(store.bundled).toBe(true)
    expect(store.dir).toBe(res)
    expect(store.info().missing).toEqual([])
    store.choose(join(root, 'anywhere'))
    expect(existsSync(join(userData, 'project.json'))).toBe(false)
  })
})
