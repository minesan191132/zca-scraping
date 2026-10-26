<script lang="ts">
  import { fly } from 'svelte/transition'
  import { toast } from 'svelte-sonner'
  import { Button } from '$lib/components/ui/button'
  import Glyph from '$lib/components/ui/glyph/Glyph.svelte'
  import BotCard from '$lib/components/bot/BotCard.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { DUR_SHORT, ms } from '$lib/motion'
  import { project } from '$lib/stores/project.svelte'
  import { status } from '$lib/stores/status.svelte'

  const counts = $derived(status.counts())
  const last = $derived(
    status.lastCheck ? new Date(status.lastCheck).toTimeString().slice(0, 8) : '…'
  )

  async function refresh(): Promise<void> {
    await status.poll()
    toast.info(t('toast.refreshed'))
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
    <div>
      <p class="num text-3xl font-semibold leading-none">
        {#key counts.running}<span class="inline-block" in:fly={{ y: 8, duration: ms(DUR_SHORT) }}
            >{status.loaded ? counts.running : '…'}</span
          >{/key}<span class="text-lg font-normal text-muted-foreground"
          >/{project.botIds.length}</span
        >
      </p>
      <p class="mt-1.5 text-sm text-muted-foreground">{t('tile.bots')}</p>
    </div>
    <dl class="flex gap-x-8 text-sm">
      <div>
        <dt class="text-xs text-muted-foreground">{t('tile.stopped')}</dt>
        <dd class="num font-medium">{status.loaded ? counts.stopped : '…'}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">{t('tile.problems')}</dt>
        <dd class={counts.problems > 0 ? 'num font-medium text-dead' : 'num font-medium'}>
          {status.loaded ? counts.problems : '…'}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">{t('tile.lastCheck')}</dt>
        <dd class="num font-medium">{last}</dd>
      </div>
    </dl>
    <Button variant="outline" size="sm" class="ml-auto" onclick={refresh}>
      <Glyph name="refresh" class="size-3.5" />
      {t('home.refresh')}
    </Button>
  </div>

  <p class="text-sm text-muted-foreground">
    {t(project.bundled ? 'sub.homeBundled' : 'sub.home')}
  </p>

  <div class="space-y-4">
    {#each project.botIds as id (id)}
      <BotCard {id} />
    {/each}
  </div>
</div>
