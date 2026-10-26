import { SvelteSet } from 'svelte/reactivity'
import type { ConfigSetting } from '@shared/ipc'
import { isBundledSetting } from '@shared/bundled-settings'
import { kindOf, TIME_PATHS, LIST_PATHS, type SettingKind } from '@shared/setting-kinds'
import { validateDraft, type FieldError } from '@shared/validation'
import { project } from './project.svelte'

type Values = Record<string, unknown>

const pad = (n: number): string => String(n).padStart(2, '0')
const clone = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T))
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

/** The form works on "HH:MM" strings and arrays, so the raw config value is converted first. */
function norm(path: string, v: unknown): unknown {
  if (TIME_PATHS.has(path)) {
    if (typeof v !== 'number') return v ?? null
    const d = new Date(v)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  if (LIST_PATHS.has(path) && (v === null || v === undefined)) return []
  return clone(v)
}

export interface Change {
  path: string
  from: unknown
  to: unknown
}

class ConfigStore {
  loaded = $state(false)
  loading = $state(false)
  loadError = $state<{ code: 'no-project' | 'missing-script' | 'failed'; error: string } | null>(
    null
  )
  settings = $state<ConfigSetting[]>([])
  overlayFile = $state('')
  /** values of the real config */
  base = $state<Values>({})
  /** values last saved to the draft file */
  saved = $state<Values>({})
  /** values on screen */
  draft = $state<Values>({})
  readonly jsonBad = new SvelteSet<string>()

  readonly errors: Record<string, FieldError> = $derived(
    validateDraft(this.settings, this.base, this.draft, this.jsonBad)
  )
  readonly dirty: string[] = $derived(
    this.settings.map((s) => s.path).filter((p) => !same(this.draft[p], this.saved[p]))
  )

  async load(): Promise<void> {
    this.loading = true
    this.loadError = null
    try {
      const r = await window.api.configLoad()
      if (!r.ok) {
        this.loaded = false
        this.loadError = { code: r.code, error: r.error }
        return
      }
      // Bản cài chỉ hiện cài đặt mà lõi cào và bộ điều phối mỏng đọc (shared/bundled-settings.ts).
      const shown = project.bundled
        ? r.dump.settings.filter((s) => isBundledSetting(s.path))
        : r.dump.settings
      this.settings = shown
      this.overlayFile = r.overlayFile
      const base: Values = {}
      const saved: Values = {}
      for (const s of shown) {
        base[s.path] = norm(s.path, s.value)
        saved[s.path] = s.path in r.overlay ? norm(s.path, r.overlay[s.path]) : clone(base[s.path])
      }
      this.base = base
      this.saved = saved
      this.draft = clone(saved)
      this.jsonBad.clear()
      this.loaded = true
    } finally {
      this.loading = false
    }
  }

  setting(path: string): ConfigSetting | undefined {
    return this.settings.find((s) => s.path === path)
  }

  kind(path: string): SettingKind {
    return kindOf(path, this.base[path])
  }

  get(path: string): unknown {
    return this.draft[path]
  }

  set(path: string, value: unknown): void {
    this.draft[path] = value
  }

  markJsonBad(path: string, bad: boolean): void {
    if (bad) this.jsonBad.add(path)
    else this.jsonBad.delete(path)
  }

  isDirty(path: string): boolean {
    return !same(this.draft[path], this.saved[path])
  }

  differsFromDefault(path: string): boolean {
    const s = this.setting(path)
    return !!s && s.hasDefault && !same(norm(path, s.default), this.draft[path])
  }

  undo(path: string): void {
    this.draft[path] = clone(this.saved[path])
    this.markJsonBad(path, false)
  }

  toDefault(path: string): void {
    const s = this.setting(path)
    if (!s) return
    this.draft[path] = norm(path, s.default)
    this.markJsonBad(path, false)
  }

  revertAll(): void {
    for (const p of this.dirty) this.undo(p)
  }

  /** dot state of a set of settings, for the navigation */
  stateOf(paths: readonly string[]): { dirty: boolean; error: boolean } {
    return {
      dirty: paths.some((p) => this.dirty.includes(p)),
      error: paths.some((p) => p in this.errors)
    }
  }

  /** Writes the draft file. Only values that differ from the real config are stored. */
  async save(): Promise<{ changes: Change[]; bots: string[]; file: string; warnings: string[] }> {
    const paths = [...this.dirty]
    const overlay: Values = {}
    for (const s of this.settings)
      if (!same(this.draft[s.path], this.base[s.path])) overlay[s.path] = clone(this.draft[s.path])
    // clone() gives plain data: the draft is a $state proxy and Electron cannot send a Proxy over IPC
    const r = await window.api.configSave(overlay)
    // Bot từ chối cấu hình (bản cài): file cũ được giữ, nên KHÔNG đánh dấu đã lưu; SaveBar hiện lỗi và bản nháp còn nguyên.
    if (!r.ok) throw new Error(r.errors.join('; '))
    const changes = paths.map((path) => ({
      path,
      from: clone(this.saved[path]),
      to: clone(this.draft[path])
    }))
    for (const p of paths) this.saved[p] = clone(this.draft[p])
    const bots = [
      ...new Set(
        paths
          .flatMap((p) => this.setting(p)?.readers ?? [])
          .filter((x) => x.startsWith('bot:'))
          .map((x) => x.slice(4))
      )
    ]
    return { changes, bots, file: r.file, warnings: r.warnings ?? [] }
  }
}

export const config = new ConfigStore()
