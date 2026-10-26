import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { CONFIG_SCRIPT, REQUIRED_SCRIPTS } from '@shared/bots'
import type { ProjectInfo } from '@shared/ipc'
import { SOURCE_MODE, type Mode } from './command'

export interface Inspection {
  /** the folder has a package.json */
  valid: boolean
  missing: string[]
  configReady: boolean
}

/** Looks at the folder's package.json: which required scripts are defined and whether `config:dump` is there. */
export function inspectProject(dir: string): Inspection {
  let scripts: Record<string, unknown> = {}
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      scripts?: Record<string, unknown>
    }
    scripts = pkg.scripts ?? {}
  } catch {
    return { valid: false, missing: [...REQUIRED_SCRIPTS], configReady: false }
  }
  return {
    valid: true,
    missing: REQUIRED_SCRIPTS.filter((s) => typeof scripts[s] !== 'string'),
    configReady: typeof scripts[CONFIG_SCRIPT] === 'string'
  }
}

/** A folder can host the bot and job pages when package.json defines every required script. */
export const isUsable = (i: Inspection): boolean => i.valid && i.missing.length === 0

const usableDir = (dir: string): boolean => existsSync(dir) && isUsable(inspectProject(dir))

/** How many parent folders to look at above each starting point. */
const MAX_LEVELS = 12

/**
 * Looks for the bot project around the places the app lives: each starting folder and its parents, and at each level the folder
 * itself and a sibling named `zca-scrape-message`. A folder only counts when it defines the required scripts, so the panel's
 * own package.json is skipped and the search goes on upwards. Returns the first match, or null.
 *
 * This is why a panel built inside the project (`<project>/panel/...`) opens without a folder prompt, and so does the older layout
 * where the panel sat next to the project.
 */
export function findProjectFrom(starts: readonly string[]): string | null {
  const seen = new Set<string>()
  for (const start of starts) {
    let dir = resolve(start)
    for (let level = 0; level < MAX_LEVELS; level++) {
      for (const candidate of [dir, join(dir, 'zca-scrape-message')]) {
        if (seen.has(candidate)) continue
        seen.add(candidate)
        if (usableDir(candidate)) return candidate
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  return null
}

/** Reads `{ "dir": "<path>" }` written at build time; a missing file, a bad file or a folder that no longer fits gives null. */
export function readDefaultProject(file: string | null): string | null {
  if (!file) return null
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as { dir?: unknown }
    return typeof raw.dir === 'string' && usableDir(raw.dir) ? resolve(raw.dir) : null
  } catch {
    return null
  }
}

/**
 * Chế độ bản cài: không có thư mục dự án để tìm hay chọn. "Dự án" là thư mục resources (chứa dist/); các script bắt buộc
 * không còn nghĩa, nên `missing` luôn rỗng.
 */
export function bundledProject(resources: string): ProjectInfo {
  return {
    dir: resources,
    missing: [],
    configReady: existsSync(join(resources, 'dist', 'cli', 'config-dump.js'))
  }
}

export interface ProjectSearch {
  /** folders to search around, see findProjectFrom */
  starts: readonly string[]
  /** file written at build time with the project the app was built in */
  defaultFile: string | null
}

/**
 * Remembers which folder holds the bot project. Order: ZCA_PROJECT_DIR, the saved choice, a search around where the app lives,
 * the folder recorded at build time. Only when all of them fail does the app ask. The saved choice lives in the user data folder.
 */
export class ProjectStore {
  private readonly file: string
  private saved: string | null = null
  private found: string | null | undefined

  constructor(
    userDataDir: string,
    private readonly search: ProjectSearch = { starts: [], defaultFile: null },
    private readonly mode: () => Mode = () => SOURCE_MODE
  ) {
    this.file = join(userDataDir, 'project.json')
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as { dir?: unknown }
      if (typeof raw.dir === 'string') this.saved = raw.dir
    } catch {
      // nothing saved yet
    }
  }

  /** the search result is kept, so the status polls do not walk the folders again */
  private auto(): string | null {
    if (this.found === undefined) {
      this.found =
        findProjectFrom(this.search.starts) ?? readDefaultProject(this.search.defaultFile)
    }
    return this.found
  }

  /** bản cài: không có gì để chọn, `choose` không hỏi và không lưu */
  get bundled(): boolean {
    return this.mode().bundled
  }

  get dir(): string | null {
    const m = this.mode()
    if (m.bundled) return resolve(m.resources)
    for (const c of [process.env.ZCA_PROJECT_DIR, this.saved]) {
      if (c && usableDir(c)) return resolve(c)
    }
    return this.auto()
  }

  /** Saves the folder when it defines the required scripts; returns the inspection either way. */
  choose(dir: string): Inspection {
    if (this.bundled) return { valid: true, missing: [], configReady: this.info().configReady }
    const inspection = inspectProject(dir)
    if (isUsable(inspection)) {
      this.saved = resolve(dir)
      writeFileSync(this.file, JSON.stringify({ dir: this.saved }, null, 2) + '\n', 'utf8')
    }
    return inspection
  }

  info(): ProjectInfo {
    const m = this.mode()
    if (m.bundled) return { ...bundledProject(resolve(m.resources)), bundled: true }
    const dir = this.dir
    if (!dir) return { dir: null, missing: [], configReady: false }
    const i = inspectProject(dir)
    return { dir, missing: i.missing, configReady: i.configReady }
  }
}
