// The only commands the panel may run. The renderer sends a bot id or a job id, never a command line.

export const BOT_IDS = ['watch', 'runner', 'chat', 'total'] as const

/** Hai bot có trong bản cài (bản gộp): theo dõi tin và điều phối cào. Chat và báo cáo tổng không nằm trong gói bán. */
export const BUNDLED_BOT_IDS = ['watch', 'runner'] as const
export type BotId = (typeof BOT_IDS)[number]

export interface BotDef {
  id: BotId
  /** npm script that starts the long-running bot */
  start: string
  /** npm script that prints its status (first line decides, see status-parse) */
  status: string
}

export const BOTS: readonly BotDef[] = [
  { id: 'watch', start: 'bot:watch', status: 'watch:status' },
  { id: 'runner', start: 'bot:runner', status: 'runner:status' },
  { id: 'chat', start: 'bot:chat', status: 'chat:status' },
  { id: 'total', start: 'bot:total', status: 'total:status' }
]

/** What a job does: rebuild today's reports (run), write the total files (total), and optionally send the files to the printer (-print). */
export const JOB_MODES = ['run', 'run-print', 'total', 'total-print'] as const
export type JobMode = (typeof JOB_MODES)[number]

export const JOB_SLOTS = ['morning', 'afternoon'] as const
export type JobSlot = (typeof JOB_SLOTS)[number]

/** A job as the user sets it up: a mode, the report sets it covers (empty = every set) and, for the total modes, the slot. */
export interface JobRequest {
  mode: JobMode
  /** ids of config.reportSets; empty means every set that runs */
  sets: string[]
  slot: JobSlot
}

export const modeRebuilds = (mode: JobMode): boolean => mode === 'run' || mode === 'run-print'
export const modeExports = (mode: JobMode): boolean => mode !== 'run'
export const modePrints = (mode: JobMode): boolean => mode.endsWith('print')

/**
 * Set ids end up on a cmd.exe command line, so only letters, digits, space, dot, underscore and hyphen are accepted
 * (no quotes, no & | < > ^ % and no comma, which separates the ids in --set).
 */
const SET_ID = /^[\p{L}\p{N}_.-]+(?: [\p{L}\p{N}_.-]+)*$/u
export const isSetId = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 64 && SET_ID.test(v)

/** Validates what the renderer sent; null when anything is off. */
export function parseJobRequest(v: unknown): JobRequest | null {
  if (!v || typeof v !== 'object') return null
  const { mode, sets, slot } = v as Record<string, unknown>
  if (!(JOB_MODES as readonly unknown[]).includes(mode)) return null
  if (!(JOB_SLOTS as readonly unknown[]).includes(slot)) return null
  if (!Array.isArray(sets) || !sets.every(isSetId)) return null
  return { mode: mode as JobMode, sets: [...new Set(sets as string[])], slot: slot as JobSlot }
}

/**
 * The `npm -s` argument lists to run, in order (the job stops at the first one that fails). Sets are passed once as
 * `--set A,B` so Zalo is scraped once for all of them; none selected means no --set, which the bot reads as every set.
 */
export function jobSteps(req: JobRequest): string[][] {
  const set = req.sets.length > 0 ? ['--set', req.sets.join(',')] : []
  const steps: string[][] = []
  if (modeRebuilds(req.mode))
    steps.push(['run', 'today', ...(set.length > 0 ? ['--', ...set] : [])])
  if (modeExports(req.mode))
    steps.push([
      'run',
      'total:once',
      '--',
      '--slot',
      req.slot,
      ...set,
      ...(modePrints(req.mode) ? ['--print'] : [])
    ])
  return steps
}

/** npm scripts a project folder must define for the bot and job pages to work */
export const REQUIRED_SCRIPTS: readonly string[] = [
  ...BOTS.flatMap((b) => [b.start, b.status]),
  'today',
  'total:once'
]

/** read-only command that dumps the config; missing it only disables the settings tabs */
export const CONFIG_SCRIPT = 'config:dump'

export const isBotId = (v: unknown): v is BotId =>
  typeof v === 'string' && (BOT_IDS as readonly string[]).includes(v)
