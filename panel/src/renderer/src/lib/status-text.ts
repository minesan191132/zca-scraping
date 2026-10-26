import type { BotStatus } from '@shared/status'
import type { ShownState } from '$lib/stores/status.svelte'
import { t } from '$lib/i18n/index.svelte'

/** One plain sentence for the status line; the raw command output stays under "Details". */
export function headlineOf(s: BotStatus, shown: ShownState): string {
  if (shown === 'starting') return t('head.starting')
  switch (s.kind) {
    case 'stopped':
      return t('head.stopped', { time: s.time ?? '?' })
    case 'dead':
      return t('head.dead', { time: s.time ?? '?' })
    case 'gone':
      return t('head.gone', { pid: s.pid ?? '?' })
    case 'never':
      return t('head.never')
    case 'blind':
      return t('head.blind', { time: s.time ?? '?' })
    case 'error':
      return t('head.error')
    case 'running': {
      const base = s.since ? t('head.running', { since: s.since }) : t('head.runningNow')
      return s.dry ? `${base} · ${t('head.dry')}` : base
    }
    default:
      return t('head.unknown', { raw: s.headline || '-' })
  }
}
