<script lang="ts">
  import { tick } from 'svelte'
  import Glyph from '$lib/components/ui/glyph/Glyph.svelte'
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
    mark: 'font-semibold text-tail-mark',
    error: 'text-tail-error',
    warn: 'text-tail-warn'
  }
</script>

<div class="flex h-[calc(100vh-17rem)] min-h-72 flex-col overflow-hidden rounded-md border bg-card">
  <div class="flex items-center gap-4 border-b px-3 py-2">
    <div class="flex items-center gap-2">
      <Checkbox id="follow-{channel}" bind:checked={follow} />
      <Label for="follow-{channel}" class="text-sm font-normal text-muted-foreground"
        >{t('log.follow')}</Label
      >
    </div>
    <div class="flex-1"></div>
    <Button variant="ghost" size="sm" onclick={() => logs.clear(channel)}
      ><Glyph name="trash" class="size-3.5" /> {t('log.clear')}</Button
    >
  </div>
  <div
    bind:this={box}
    class="flex-1 overflow-auto bg-tail-bg p-3 font-mono text-xs leading-relaxed text-tail-fg"
  >
    {#if entries.length === 0}
      <div class="flex h-full flex-col items-center justify-center gap-1 text-center text-tail-dim">
        <p>{t('log.empty')}</p>
        <p class="max-w-md">{t('log.emptyHint')}</p>
      </div>
    {:else}
      {#each entries as e, i (i)}
        <div class="whitespace-pre-wrap break-words">
          <span class="text-tail-dim">{time(e.t)}</span>
          <span class={cn(color[e.level])}>{e.text}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
