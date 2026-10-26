import { toast } from 'svelte-sonner'
import { modeExports, type BotId, type JobRequest } from '@shared/bots'
import { confirmAction } from '$lib/stores/confirm.svelte'
import { logs } from '$lib/stores/logs.svelte'
import { status } from '$lib/stores/status.svelte'
import { t, type MessageKey } from '$lib/i18n/index.svelte'

const KNOWN_ERRORS = [
  'no-project',
  'unknown-bot',
  'already-started',
  'no-pid',
  'bad-job',
  'already-running'
] as const

/** Turns an error code from the main process into a sentence in the current language. */
export function actionError(code: string | undefined): string {
  if (!code) return ''
  return (KNOWN_ERRORS as readonly string[]).includes(code)
    ? t(`action.err.${code}` as MessageKey)
    : code
}

export async function startBot(id: BotId): Promise<void> {
  const ok = await confirmAction({
    title: t('confirm.startTitle', { name: t(`bot.${id}.name`) }),
    body: t(`bot.${id}.desc`)
  })
  if (!ok) return
  const r = await status.act(id, () => window.api.startBot(id))
  if (!r.ok) {
    logs.push(id, `✗ ${r.error ?? ''}`)
    toast.warning(actionError(r.error))
  }
}

export async function stopBot(id: BotId): Promise<void> {
  const s = status.of(id)
  const pid = s?.pid ?? null
  const body = t(s?.startedByApp ? 'confirm.stopOwn' : 'confirm.stopExternal', { pid: pid ?? '?' })
  const ok = await confirmAction({
    title: t('confirm.stopTitle', { name: t(`bot.${id}.name`) }),
    body,
    danger: true
  })
  if (!ok) return
  const r = await status.act(id, () => window.api.stopBot(id, pid))
  if (!r.ok) {
    logs.push(id, `✗ ${r.error ?? ''}`)
    toast.warning(actionError(r.error))
  }
}

/** Returns once the job has finished (or was cancelled). `setNames` is what the confirm dialog shows for the sets. */
export async function runJob(request: JobRequest, setNames: string): Promise<void> {
  const body = [
    t('jobs.confirmSets', { sets: setNames }),
    modeExports(request.mode) ? t('jobs.confirmSlot', { slot: t(`jobs.slot.${request.slot}`) }) : ''
  ]
    .filter(Boolean)
    .join(' ')
  const ok = await confirmAction({
    title: t('confirm.jobTitle', { name: t(`jobs.mode.${request.mode}.name`) }),
    body,
    danger: true
  })
  if (!ok) return
  const r = await window.api.runJob(request)
  if (!r.ok && r.error) {
    logs.push('jobs', `✗ ${r.error}`)
    toast.warning(actionError(r.error))
  }
}
