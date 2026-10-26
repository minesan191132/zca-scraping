<script lang="ts">
  import { cn } from '$lib/utils'
  import type { ShownState } from '$lib/stores/status.svelte'

  let { state, class: className }: { state: ShownState; class?: string } = $props()

  const tone: Record<ShownState, string> = {
    alive: 'bg-emerald-500',
    starting: 'bg-amber-500',
    busy: 'bg-amber-500',
    warn: 'bg-amber-500',
    dead: 'bg-red-500',
    stopped: 'bg-muted-foreground/50',
    loading: 'bg-muted-foreground/30'
  }
</script>

<span
  class={cn(
    'inline-block size-2.5 shrink-0 rounded-full',
    tone[state],
    state === 'alive' && 'animate-pulse',
    className
  )}
></span>
