<script lang="ts">
  import { fly } from 'svelte/transition'
  import type { BotId } from '@shared/bots'
  import StatusBadge from '$lib/components/shell/StatusBadge.svelte'
  import { botDesc, botName } from '$lib/bot-text'
  import { t } from '$lib/i18n/index.svelte'
  import { DUR_SHORT, ms } from '$lib/motion'
  import { headlineOf } from '$lib/status-text'
  import { logs } from '$lib/stores/logs.svelte'
  import { nav } from '$lib/stores/nav.svelte'
  import { status } from '$lib/stores/status.svelte'
  import { cn } from '$lib/utils'
  import BotButtons from './BotButtons.svelte'

  let { id }: { id: BotId } = $props()

  const shown = $derived(status.shown(id))
  const s = $derived(status.of(id))
  const tail = $derived(logs.lines(id).at(-1))
  const rail = $derived(
    shown === 'alive'
      ? 'bg-alive'
      : shown === 'dead'
        ? 'bg-dead'
        : shown === 'warn' || shown === 'starting' || shown === 'busy'
          ? 'bg-warn'
          : 'bg-border'
  )
  const busy = $derived(shown === 'starting' || shown === 'busy')
  const tailTone = {
    plain: 'text-tail-fg',
    mark: 'text-tail-mark',
    error: 'text-tail-error',
    warn: 'text-tail-warn'
  }

  const open = (): void => nav.go({ name: 'bot', id, tab: 'status' })
</script>

<!-- Một "làn" cho mỗi bot: vạch trạng thái bên trái, tên, câu trạng thái, và dòng nhật ký mới nhất. Cả làn là liên kết tới trang bot; nút bên trong không để sự kiện nổi lên. -->
<div
  role="link"
  tabindex="0"
  class="group relative flex cursor-pointer overflow-hidden rounded-md border bg-card outline-none transition-colors duration-[var(--dur-micro)] hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring"
  onclick={open}
  onkeydown={(e) => {
    if (e.key === 'Enter') open()
  }}
>
  <span
    class={cn(
      'lane-rail w-1 shrink-0 transition-colors duration-[var(--dur-short)]',
      rail,
      busy && 'lane-rail-busy'
    )}
  ></span>
  <div class="min-w-0 flex-1 space-y-3 p-4">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h3 class="min-w-0 text-base font-semibold">{botName(id)}</h3>
      <code class="text-xs text-muted-foreground">bot:{id}</code>
      <StatusBadge state={shown} class="ml-auto" />
    </div>
    <p class="text-sm text-muted-foreground">{botDesc(id)}</p>
    <p class="min-h-5 text-sm font-medium">{s ? headlineOf(s, shown) : ''}</p>
    <div
      class="flex h-9 items-center overflow-hidden rounded-sm bg-tail-bg px-3 font-mono text-xs text-tail-fg"
      aria-label={t('card.tail')}
    >
      {#key tail?.t}
        <span
          class={cn('truncate', tail ? tailTone[tail.level] : 'text-tail-dim')}
          in:fly={{ y: 6, duration: ms(DUR_SHORT) }}
        >
          {tail ? tail.text : t('card.tailEmpty')}
        </span>
      {/key}
    </div>
    <BotButtons {id} />
  </div>
</div>

<style>
  .lane-rail {
    position: relative;
    overflow: hidden;
  }
  /* Khi bot đang khởi động hoặc bận, một vệt sáng chạy dọc thanh trạng thái. Chỉ là chỉ báo trạng thái, hết bận thì dừng. */
  .lane-rail-busy::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent,
      color-mix(in oklab, var(--background) 70%, transparent),
      transparent
    );
    animation: lane-sweep 1.1s var(--ease-in-out) infinite;
  }
  @keyframes lane-sweep {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(100%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lane-rail-busy::after {
      animation: none;
    }
  }
</style>
