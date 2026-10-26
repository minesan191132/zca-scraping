<script lang="ts">
  import Activity from '@lucide/svelte/icons/activity'
  import CircleAlert from '@lucide/svelte/icons/circle-alert'
  import Clock from '@lucide/svelte/icons/clock'
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'
  import Square from '@lucide/svelte/icons/square'
  import { toast } from 'svelte-sonner'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import BotCard from '$lib/components/bot/BotCard.svelte'
  import LicenseCard from '$lib/components/shell/LicenseCard.svelte'
  import { t } from '$lib/i18n/index.svelte'
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
  {#if project.bundled}<LicenseCard />{/if}
  <div class="flex items-center justify-between">
    <p class="text-sm text-muted-foreground">
      {t(project.bundled ? 'sub.homeBundled' : 'sub.home')}
    </p>
    <Button variant="outline" size="sm" onclick={refresh}><RefreshCw /> {t('home.refresh')}</Button>
  </div>

  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    {#each [{ icon: Activity, value: status.loaded ? counts.running : '…', label: t('tile.bots'), tone: 'text-emerald-600 dark:text-emerald-400' }, { icon: Square, value: status.loaded ? counts.stopped : '…', label: t('tile.stopped'), tone: 'text-muted-foreground' }, { icon: CircleAlert, value: status.loaded ? counts.problems : '…', label: t('tile.problems'), tone: counts.problems > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground' }, { icon: Clock, value: last, label: t('tile.lastCheck'), tone: 'text-muted-foreground' }] as tile (tile.label)}
      <Card.Root>
        <Card.Content>
          <div class="flex items-center gap-3">
            <span class="flex size-10 items-center justify-center rounded-lg bg-muted {tile.tone}"
              ><tile.icon class="size-5" /></span
            >
            <div>
              <p class="text-2xl font-semibold leading-none">{tile.value}</p>
              <p class="mt-1 text-xs text-muted-foreground">{tile.label}</p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    {/each}
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    {#each project.botIds as id (id)}
      <BotCard {id} />
    {/each}
  </div>
</div>
