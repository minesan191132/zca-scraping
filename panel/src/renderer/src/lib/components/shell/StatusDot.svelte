<script lang="ts">
  import { cn } from '$lib/utils'
  import type { ShownState } from '$lib/stores/status.svelte'

  // Ô vuông nhỏ màu theo trạng thái. Luôn đứng cạnh chữ nói rõ trạng thái; một mình nó chỉ là trang trí.
  let {
    state,
    class: className,
    label
  }: { state: ShownState; class?: string; label?: string } = $props()

  const tone: Record<ShownState, string> = {
    alive: 'bg-alive',
    starting: 'bg-warn',
    busy: 'bg-warn',
    warn: 'bg-warn',
    dead: 'bg-dead',
    stopped: 'bg-muted-foreground/45',
    loading: 'bg-muted-foreground/30'
  }
</script>

<span
  class={cn(
    'inline-block size-2 shrink-0 transition-colors duration-[var(--dur-short)]',
    tone[state],
    className
  )}
  title={label}
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
></span>
