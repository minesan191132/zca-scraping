<script lang="ts">
  import type { BotId } from '@shared/bots'
  import { pathsFor } from '@shared/settings-map'
  import * as Tabs from '$lib/components/ui/tabs'
  import * as Card from '$lib/components/ui/card'
  import BotButtons from '$lib/components/bot/BotButtons.svelte'
  import BotIcon from '$lib/components/bot/BotIcon.svelte'
  import LogView from '$lib/components/bot/LogView.svelte'
  import StatusBadge from '$lib/components/shell/StatusBadge.svelte'
  import { botDesc, botName } from '$lib/bot-text'
  import { headlineOf } from '$lib/status-text'
  import { t } from '$lib/i18n/index.svelte'
  import { config } from '$lib/stores/config.svelte'
  import { logs } from '$lib/stores/logs.svelte'
  import { nav, type BotTab } from '$lib/stores/nav.svelte'
  import { status } from '$lib/stores/status.svelte'
  import SettingsView from './SettingsView.svelte'

  let { id, tab }: { id: BotId; tab: BotTab } = $props()

  const shown = $derived(status.shown(id))
  const s = $derived(status.of(id))
  const paths = $derived(
    pathsFor(
      config.settings.map((x) => x.path),
      id
    )
  )
  const dot = $derived(config.stateOf(paths))
  const logCount = $derived(logs.lines(id).length)
</script>

<div class="space-y-6">
  <div class="flex items-start gap-4">
    <span
      class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-primary"
    >
      <BotIcon {id} class="size-6" />
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold">{botName(id)}</h2>
        <StatusBadge state={shown} />
      </div>
      <p class="mt-1 max-w-3xl text-sm text-muted-foreground">{botDesc(id)}</p>
    </div>
    <BotButtons {id} />
  </div>

  <Tabs.Root value={tab} onValueChange={(v) => nav.tab(v as BotTab)}>
    <Tabs.List>
      <Tabs.Trigger value="status">{t('tab.status')}</Tabs.Trigger>
      <Tabs.Trigger value="logs">
        {t('tab.logs')}
        {#if logCount > 0}<span class="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 text-xs"
            >{logCount}</span
          >{/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="settings">
        {t('tab.settings')}
        {#if dot.error}
          <span class="ml-1.5 size-2 rounded-full bg-red-500" title={t('save.dirtyDot')}></span>
        {:else if dot.dirty}
          <span class="ml-1.5 size-2 rounded-full bg-amber-500" title={t('save.dirtyDot')}></span>
        {/if}
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="status" class="pt-4">
      <Card.Root>
        <Card.Content class="space-y-4">
          <p class="text-base font-medium">{s ? headlineOf(s, shown) : ''}</p>
          <p class="text-xs text-muted-foreground">
            {#if s?.startedByApp}{t(
                'card.byApp'
              )}{:else if shown === 'alive' || shown === 'warn'}{t('card.outside')}{/if}
          </p>
          {#if s?.text}
            <details class="rounded-lg border bg-muted/40 p-3 text-sm">
              <summary class="cursor-pointer select-none font-medium">{t('card.details')}</summary>
              <p class="mt-2 text-xs text-muted-foreground">{t('card.rawNote')}</p>
              <pre
                class="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">{s.text}</pre>
            </details>
          {/if}
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <Tabs.Content value="logs" class="pt-4"><LogView channel={id} /></Tabs.Content>

    <Tabs.Content value="settings" class="pt-4"><SettingsView {paths} /></Tabs.Content>
  </Tabs.Root>
</div>
