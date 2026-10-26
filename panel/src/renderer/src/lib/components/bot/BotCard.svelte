<script lang="ts">
  import type { BotId } from '@shared/bots'
  import * as Card from '$lib/components/ui/card'
  import StatusBadge from '$lib/components/shell/StatusBadge.svelte'
  import { botDesc, botName } from '$lib/bot-text'
  import { headlineOf } from '$lib/status-text'
  import { nav } from '$lib/stores/nav.svelte'
  import { status } from '$lib/stores/status.svelte'
  import BotButtons from './BotButtons.svelte'
  import BotIcon from './BotIcon.svelte'
  import { cn } from '$lib/utils'

  let { id }: { id: BotId } = $props()

  const shown = $derived(status.shown(id))
  const s = $derived(status.of(id))
  const edge = $derived(
    shown === 'alive'
      ? 'border-l-emerald-500'
      : shown === 'dead'
        ? 'border-l-red-500'
        : shown === 'warn' || shown === 'starting' || shown === 'busy'
          ? 'border-l-amber-500'
          : 'border-l-transparent'
  )
</script>

<!-- The card is a link to the bot page; the buttons inside stop the click from bubbling up to it. -->
<div
  role="link"
  tabindex="0"
  class="cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-xl"
  onclick={() => nav.go({ name: 'bot', id, tab: 'status' })}
  onkeydown={(e) => {
    if (e.key === 'Enter') nav.go({ name: 'bot', id, tab: 'status' })
  }}
>
  <Card.Root class={cn('border-l-4 transition-shadow hover:shadow-md', edge)}>
    <Card.Header>
      <div class="flex items-start gap-3">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"
        >
          <BotIcon {id} class="size-5" />
        </span>
        <div class="min-w-0 flex-1">
          <Card.Title class="truncate">{botName(id)}</Card.Title>
          <code class="text-xs text-muted-foreground">bot:{id}</code>
        </div>
        <StatusBadge state={shown} />
      </div>
    </Card.Header>
    <Card.Content class="space-y-3">
      <p class="text-sm text-muted-foreground">{botDesc(id)}</p>
      <p class="min-h-5 text-sm font-medium">{s ? headlineOf(s, shown) : ''}</p>
      <BotButtons {id} />
    </Card.Content>
  </Card.Root>
</div>
