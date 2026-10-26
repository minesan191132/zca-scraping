<script lang="ts">
  import { pathsFor } from '@shared/settings-map'
  import * as Tabs from '$lib/components/ui/tabs'
  import { t } from '$lib/i18n/index.svelte'
  import { config } from '$lib/stores/config.svelte'
  import { nav, type GeneralPage } from '$lib/stores/nav.svelte'
  import ProjectPicker from './ProjectPicker.svelte'
  import SettingsView from './SettingsView.svelte'

  let { tab }: { tab: GeneralPage } = $props()

  const TABS = ['project', 'zalo', 'groups', 'scrape', 'vision'] as const
  const all = $derived(config.settings.map((x) => x.path))
  const pathsOf = (key: (typeof TABS)[number]): string[] =>
    key === 'project' ? [] : pathsFor(all, 'general', key)
</script>

<div class="space-y-6">
  <p class="text-sm text-muted-foreground">{t('sub.general')}</p>
  <Tabs.Root value={tab} onValueChange={(v) => nav.tab(v as GeneralPage)}>
    <Tabs.List>
      {#each TABS as key (key)}
        {@const dot = config.stateOf(pathsOf(key))}
        <Tabs.Trigger value={key}>
          {t(`tab.general.${key}`)}
          {#if dot.error}<span class="ml-1.5 size-2 rounded-full bg-red-500"
            ></span>{:else if dot.dirty}<span class="ml-1.5 size-2 rounded-full bg-amber-500"
            ></span>{/if}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
    <Tabs.Content value="project" class="pt-4"><ProjectPicker /></Tabs.Content>
    {#each TABS.slice(1) as key (key)}
      <Tabs.Content value={key} class="pt-4"><SettingsView paths={pathsOf(key)} /></Tabs.Content>
    {/each}
  </Tabs.Root>
</div>
