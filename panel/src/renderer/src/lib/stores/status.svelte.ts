import { SvelteSet } from 'svelte/reactivity'
import type { BotId } from '@shared/bots'
import { project } from './project.svelte'
import type { BotState } from '@shared/status'
import type { BotStatus } from '@shared/status'

/** How long a bot the app just started may take before its first heartbeat (the watcher reopens Zalo first). */
export const STARTING_MS = 180_000
export const POLL_MS = 10_000
/** the status command needs a few seconds after a start or stop before it shows the new state */
export const SETTLE_MS = 4_000

export type ShownState = BotState | 'starting' | 'busy' | 'loading'

let statuses = $state<BotStatus[]>([])
let lastCheck = $state<number | null>(null)
const busy = new SvelteSet<BotId>()
let polling = false

function setBusy(id: BotId, on: boolean): void {
  if (on) busy.add(id)
  else busy.delete(id)
}

export const status = {
  get all(): readonly BotStatus[] {
    return statuses
  },
  get lastCheck(): number | null {
    return lastCheck
  },
  get loaded(): boolean {
    return statuses.length > 0
  },
  of(id: BotId): BotStatus | undefined {
    return statuses.find((s) => s.id === id)
  },
  /** The state to show: a bot the app just started reads "stopped" until its first heartbeat, which is "starting". */
  shown(id: BotId, now = Date.now()): ShownState {
    if (busy.has(id)) return 'busy'
    const s = statuses.find((x) => x.id === id)
    if (!s) return 'loading'
    const warmingUp = s.startedByApp && s.startedAtMs !== null && now - s.startedAtMs < STARTING_MS
    if (warmingUp && (s.state === 'stopped' || s.state === 'dead')) return 'starting'
    return s.state
  },
  /** counts for the overview tiles */
  counts(): { running: number; stopped: number; problems: number } {
    let running = 0
    let stopped = 0
    let problems = 0
    for (const id of project.botIds) {
      const s = this.shown(id)
      if (s === 'alive' || s === 'starting') running++
      else if (s === 'warn' || s === 'dead') problems++
      else if (s === 'stopped') stopped++
    }
    return { running, stopped, problems }
  },
  async poll(): Promise<void> {
    if (polling) return
    polling = true
    try {
      statuses = await window.api.status()
      lastCheck = Date.now()
    } finally {
      polling = false
    }
  },
  /** Runs a start or stop, shows the bot as busy meanwhile and polls again once the status has had time to change. */
  async act(
    id: BotId,
    run: () => Promise<{ ok: boolean; error?: string }>
  ): Promise<{ ok: boolean; error?: string }> {
    setBusy(id, true)
    try {
      return await run()
    } finally {
      setTimeout(() => {
        setBusy(id, false)
        void status.poll()
      }, SETTLE_MS)
    }
  }
}
