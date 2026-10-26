<script lang="ts">
  import { tick } from 'svelte'
  import Terminal from '@lucide/svelte/icons/terminal'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import { Button } from '$lib/components/ui/button'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import { Label } from '$lib/components/ui/label'
  import { t } from '$lib/i18n/index.svelte'
  import { logs, SHOW_LINES } from '$lib/stores/logs.svelte'
  import { cn } from '$lib/utils'

  let { channel }: { channel: string } = $props()

  let follow = $state(true)
  let box: HTMLDivElement | undefined = $state()

  const entries = $derived(logs.lines(channel).slice(-SHOW_LINES))
  const time = (ms: number): string => new Date(ms).toTimeString().slice(0, 8)

  $effect(() => {
    void entries.length
    if (follow && box) void tick().then(() => box && (box.scrollTop = box.scrollHeight))
  })

  const color: Record<string, string> = {
    plain: '',
    mark: 'font-semibold text-sky-400',
    error: 'text-red-400',
    warn: 'text-amber-400'
  }
</script>

<div class="flex h-[calc(100vh-17rem)] min-h-72 flex-col overflow-hidden rounded-xl border bg-card">
  <div class="flex items-center gap-4 border-b px-3 py-2">
    <div class="flex items-center gap-2">
      <Checkbox id="follow-{channel}" bind:checked={follow} />
      <Label for="follow-{channel}" class="text-sm font-normal text-muted-foreground"
        >{t('log.follow')}</Label
      >
    </div>
    <div class="flex-1"></div>
    <Button variant="ghost" size="sm" onclick={() => logs.clear(channel)}
      ><Trash2 /> {t('log.clear')}</Button
    >
  </div>
  <div
    bind:this={box}
    class="flex-1 overflow-auto bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-200"
  >
    {#if entries.length === 0}
      <div class="flex h-full flex-col items-center justify-center gap-1 text-center text-zinc-500">
        <Terminal class="mb-1 size-7" />
        <p>{t('log.empty')}</p>
        <p class="max-w-md">{t('log.emptyHint')}</p>
      </div>
    {:else}
      {#each entries as e, i (i)}
        <div class="whitespace-pre-wrap break-words">
          <span class="text-zinc-500">{time(e.t)}</span>
          <span class={cn(color[e.level])}>{e.text}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
