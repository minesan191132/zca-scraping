<script lang="ts">
  import Glyph from '$lib/components/ui/glyph/Glyph.svelte'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { config } from '$lib/stores/config.svelte'
  import { i18n, t, type MessageKey } from '$lib/i18n/index.svelte'
  import { isStacked } from '@shared/setting-kinds'
  import { placementOf, type Placement } from '@shared/settings-map'
  import type { ConfigSetting } from '@shared/ipc'
  import NumberField from './fields/NumberField.svelte'
  import BoolField from './fields/BoolField.svelte'
  import TextField from './fields/TextField.svelte'
  import TimeField from './fields/TimeField.svelte'
  import EnumField from './fields/EnumField.svelte'
  import RangeField from './fields/RangeField.svelte'
  import ListField from './fields/ListField.svelte'
  import AliasesField from './fields/AliasesField.svelte'
  import SetsField from './fields/SetsField.svelte'
  import JsonField from './fields/JsonField.svelte'

  let { path }: { path: string } = $props()

  const setting = $derived(config.setting(path))
  const kind = $derived(config.kind(path))
  const stacked = $derived(isStacked(kind))
  const dirty = $derived(config.isDirty(path))
  const differs = $derived(config.differsFromDefault(path))
  const error = $derived(config.errors[path])

  function defaultText(s: ConfigSetting): string {
    if (!s.hasDefault)
      return s.defaultLabel ? i18n.defaultLabel(s.defaultLabel) : t('cfg.noDefault')
    const v = s.default
    if (typeof v === 'boolean') return v ? t('cfg.on') : t('cfg.off')
    if (v === null) return t('cfg.noLimit')
    if (typeof v === 'object') return JSON.stringify(v)
    return s.unit && typeof v === 'number' ? `${v} ${i18n.unit(s.unit)}` : String(v)
  }

  const botName = (reader: string): string => reader.replace(/^bot:/, '')
  const unique = (list: string[]): string[] => [...new Set(list)]

  /** the reader line: who else uses a setting that lives on a bot page, or every reader of a general one */
  const readers = $derived.by((): { key: MessageKey; bots: string } | null => {
    if (!setting) return null
    let at: Placement | null
    try {
      at = placementOf(path)
    } catch {
      at = null
    }
    if (at && at.page !== 'general') {
      const others = unique(setting.readers.filter((r) => r !== `bot:${at.page}`).map(botName))
      return others.length ? { key: 'cfg.alsoUsedBy', bots: others.join(', ') } : null
    }
    const all = unique(setting.readers.map(botName))
    return all.length ? { key: 'cfg.readBy', bots: all.join(', ') } : null
  })
</script>

{#if setting}
  <div
    data-path={path}
    class="grid gap-x-6 gap-y-3 rounded-md border bg-card p-4 text-card-foreground transition-colors duration-[var(--dur-short)] {stacked
      ? 'grid-cols-1'
      : 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'} {error
      ? 'border-destructive'
      : dirty
        ? 'border-warn/60'
        : ''}"
  >
    <div class="flex min-w-0 flex-col gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium">{i18n.settingLabel(path)}</span>
        {#if dirty}
          <Badge variant="secondary" class="bg-warn-soft text-warn">
            {t('cfg.unsaved')}
          </Badge>
        {:else if differs}
          <Badge variant="secondary" class="bg-secondary text-secondary-foreground">
            {t('cfg.differs')}
          </Badge>
        {/if}
      </div>
      <p class="text-sm text-muted-foreground">{i18n.settingNote(path, setting.note)}</p>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <code class="rounded-sm bg-muted px-1.5 py-0.5 font-mono">{path}</code>
        <span>{t('cfg.defaultIs', { v: defaultText(setting) })}</span>
        {#if readers}
          <span>{t(readers.key, { bots: readers.bots })}</span>
        {/if}
      </div>
    </div>

    <div class="flex min-w-0 flex-col gap-2 {stacked ? '' : 'md:items-end'}">
      <div class="w-full min-w-0 {stacked ? '' : 'md:flex md:justify-end'}">
        {#if kind === 'bool'}
          <BoolField {path} />
        {:else if kind === 'number'}
          <NumberField {path} />
        {:else if kind === 'text'}
          <TextField {path} />
        {:else if kind === 'time'}
          <TimeField {path} />
        {:else if kind === 'enum'}
          <EnumField {path} />
        {:else if kind === 'range'}
          <RangeField {path} />
        {:else if kind === 'list'}
          <ListField {path} />
        {:else if kind === 'aliases'}
          <AliasesField {path} />
        {:else if kind === 'sets'}
          <SetsField {path} />
        {:else}
          <JsonField {path} />
        {/if}
      </div>
      {#if dirty || differs}
        <div class="flex items-center gap-1">
          {#if dirty}
            <Button
              variant="ghost"
              size="sm"
              title={t('cfg.undoTitle')}
              onclick={() => config.undo(path)}
            >
              <Glyph name="undo" class="size-3.5" />
              {t('cfg.undo')}
            </Button>
          {/if}
          {#if differs}
            <Button
              variant="ghost"
              size="sm"
              title={t('cfg.defaultTitle')}
              onclick={() => config.toDefault(path)}
            >
              {t('cfg.default')}
            </Button>
          {/if}
        </div>
      {/if}
    </div>

    {#if error}
      <p role="alert" class="text-sm text-destructive {stacked ? '' : 'md:col-span-2'}">
        {t(error.key as MessageKey)}
      </p>
    {/if}
  </div>
{/if}
