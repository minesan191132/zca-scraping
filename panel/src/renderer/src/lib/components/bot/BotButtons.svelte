<script lang="ts">
  import type { BotId } from '@shared/bots'
  import { Button } from '$lib/components/ui/button'
  import Glyph from '$lib/components/ui/glyph/Glyph.svelte'
  import { startBot, stopBot } from '$lib/actions'
  import { t } from '$lib/i18n/index.svelte'
  import { status } from '$lib/stores/status.svelte'

  let { id }: { id: BotId } = $props()

  const shown = $derived(status.shown(id))
  const up = $derived(shown === 'alive' || shown === 'warn' || shown === 'starting')
  const working = $derived(shown === 'busy' || shown === 'loading')
</script>

<div class="flex items-center gap-2">
  <Button
    size="sm"
    disabled={working || up}
    onclick={(e: MouseEvent) => {
      e.stopPropagation()
      void startBot(id)
    }}
  >
    <Glyph name="play" class="size-3.5" />
    {t('card.start')}
  </Button>
  <Button
    size="sm"
    variant="outline"
    class="text-destructive hover:text-destructive"
    disabled={working || !up}
    onclick={(e: MouseEvent) => {
      e.stopPropagation()
      void stopBot(id)
    }}
  >
    <Glyph name="stop" class="size-3.5" />
    {t('card.stop')}
  </Button>
</div>
