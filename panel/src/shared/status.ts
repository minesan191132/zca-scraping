import type { BotId } from './bots'

/** alive: running; warn: process is up but not doing its job; stopped: stopped on purpose; dead: not running or unreadable */
export type BotState = 'alive' | 'warn' | 'stopped' | 'dead'

/** gone: the status file says the bot runs but its process no longer exists (it was killed and could not write "stopped") */
export type StatusKind =
  'stopped' | 'dead' | 'never' | 'blind' | 'error' | 'running' | 'gone' | 'unknown'

export interface ParsedStatus {
  state: BotState
  kind: StatusKind
  /** HH:MM taken from the headline (stopped, dead, blind) */
  time: string | null
  /** start time shown by a running bot, "dd/mm HH:MM" or "HH:MM" */
  since: string | null
  /** chat bot runs in dry-run mode */
  dry: boolean
  headline: string
  pid: number | null
}

export interface BotStatus extends ParsedStatus {
  id: BotId
  /** complete output of the status command */
  text: string
  startedByApp: boolean
  /** epoch ms when this app started the bot, null when it did not */
  startedAtMs: number | null
}
