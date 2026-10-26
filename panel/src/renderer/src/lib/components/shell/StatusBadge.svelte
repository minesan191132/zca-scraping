<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import { t } from '$lib/i18n/index.svelte'
  import type { ShownState } from '$lib/stores/status.svelte'

  let { state }: { state: ShownState } = $props()

  const tone: Record<ShownState, string> = {
    alive: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    starting: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    busy: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    dead: 'bg-red-500/15 text-red-700 dark:text-red-400',
    stopped: 'bg-muted text-muted-foreground',
    loading: 'bg-muted text-muted-foreground'
  }
</script>

<Badge variant="secondary" class={tone[state]}>{t(`state.${state}`)}</Badge>
