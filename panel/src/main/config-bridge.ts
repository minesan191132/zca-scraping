import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONFIG_SCRIPT } from '@shared/bots'
import type { ConfigDump, ConfigLoadResult, ConfigSaveResult } from '@shared/ipc'
import { runCommand, scriptCommand, SOURCE_MODE, type Mode, type Runner } from './command'
import { flattenConfig, mergeOverlay, validateOverlay } from './config-json'

const MARKER = '@@JSON@@'

/** Extracts the dump from the output of `npm run config:dump`: the JSON line after the marker. */
export function parseConfigDump(output: string): ConfigDump | { error: string } {
  const at = output.indexOf(MARKER)
  if (at < 0) return { error: output.trim().slice(0, 400) || 'no output' }
  try {
    const dump = JSON.parse(output.slice(at + MARKER.length).split(/\r?\n/)[0]) as ConfigDump
    if (!Array.isArray(dump.sections) || !Array.isArray(dump.settings))
      return { error: 'unexpected shape' }
    return dump
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export type { ConfigSaveResult }

export class ConfigBridge {
  /** source mode: edits are saved to this file in the user data folder; no bot reads it */
  readonly overlayFile: string
  private lastDump: ConfigDump | null = null

  constructor(
    userDataDir: string,
    private readonly mode: () => Mode = () => SOURCE_MODE,
    private readonly run: Runner = runCommand
  ) {
    this.overlayFile = join(userDataDir, 'settings.draft.json')
  }

  /** bundled mode: the file the bot reads, `<home>/config.json` */
  private configFile(): string {
    return join(this.mode().home, 'config.json')
  }

  private async dump(
    projectDir: string
  ): Promise<{ dump: ConfigDump; stderr: string } | { error: string }> {
    const cmd = scriptCommand(CONFIG_SCRIPT, this.mode())
    if (!cmd) return { error: 'not-in-bundle' }
    const r = await this.run(cmd, projectDir, 60_000)
    const parsed = parseConfigDump(`${r.stdout}\n${r.stderr}`)
    if ('error' in parsed) return { error: parsed.error }
    return { dump: parsed, stderr: r.stderr }
  }

  async load(projectDir: string | null, configReady: boolean): Promise<ConfigLoadResult> {
    if (!projectDir) return { ok: false, code: 'no-project', error: 'no project folder' }
    if (!configReady) return { ok: false, code: 'missing-script', error: CONFIG_SCRIPT }
    const got = await this.dump(projectDir)
    if ('error' in got) return { ok: false, code: 'failed', error: got.error }
    this.lastDump = got.dump
    const bundled = this.mode().bundled
    // bundled: the overlay is what config.json already says; source: the draft file, as before
    const file = bundled ? this.configFile() : this.overlayFile
    let overlay: Record<string, unknown> = {}
    try {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
      overlay = bundled ? flattenConfig(raw, got.dump) : raw
    } catch {
      // no draft or config.json yet
    }
    return { ok: true, dump: got.dump, overlay, overlayFile: file }
  }

  async save(
    overlay: Record<string, unknown>,
    projectDir?: string | null
  ): Promise<ConfigSaveResult> {
    if (!this.mode().bundled) {
      writeFileSync(this.overlayFile, JSON.stringify(overlay, null, 2) + '\n', 'utf8')
      return { ok: true, file: this.overlayFile, warnings: [] }
    }
    const dir = projectDir ?? this.mode().resources
    if (!this.lastDump) {
      const got = await this.dump(dir)
      if ('error' in got) return { ok: false, errors: [got.error] }
      this.lastDump = got.dump
    }
    const errors = validateOverlay(overlay, this.lastDump)
    if (errors.length > 0) return { ok: false, errors }

    const file = this.configFile()
    let before: string | null = null
    let existing: Record<string, unknown> = {}
    if (existsSync(file)) {
      before = readFileSync(file, 'utf8')
      try {
        existing = JSON.parse(before) as Record<string, unknown>
      } catch {
        return { ok: false, errors: [`${file}: không đọc được JSON, sửa hoặc xóa file trước`] }
      }
    }
    const merged = mergeOverlay(existing, overlay)
    mkdirSync(this.mode().home, { recursive: true })
    const tmp = `${file}.tmp`
    writeFileSync(tmp, JSON.stringify(merged, null, 2) + '\n', 'utf8')
    renameSync(tmp, file)

    // the bot's own check decides: a file it refuses is put back as it was
    const again = await this.dump(dir)
    if ('error' in again) {
      if (before !== null) writeFileSync(file, before, 'utf8')
      else rmSync(file, { force: true })
      return { ok: false, errors: [again.error] }
    }
    this.lastDump = again.dump
    const warnings = again.stderr.split(/\r?\n/).filter((l) => l.startsWith('[config]'))
    return { ok: true, file, warnings }
  }
}
