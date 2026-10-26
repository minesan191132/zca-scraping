<script lang="ts">
  import { t } from '$lib/i18n/index.svelte'
  import type { ShownState } from '$lib/stores/status.svelte'
  import { cn } from '$lib/utils'
  import StatusDot from './StatusDot.svelte'

  let { state, class: className }: { state: ShownState; class?: string } = $props()

  const tone: Record<ShownState, string> = {
    alive: 'bg-alive-soft text-alive',
    starting: 'bg-warn-soft text-warn',
    busy: 'bg-warn-soft text-warn',
    warn: 'bg-warn-soft text-warn',
    dead: 'bg-dead-soft text-dead',
    stopped: 'bg-muted text-muted-foreground',
    loading: 'bg-muted text-muted-foreground'
  }
</script>

<span
  class={cn(
    'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium transition-colors duration-[var(--dur-short)]',
    tone[state],
    className
  )}
>
  <StatusDot {state} class="bg-current" />
  {t(`state.${state}`)}
</span>
