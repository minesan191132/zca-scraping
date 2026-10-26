<script lang="ts">
  import { tick } from 'svelte'
  import { placementOf } from '@shared/settings-map'
  import { Button } from '$lib/components/ui/button'
  import SettingRow from '$lib/components/settings/SettingRow.svelte'
  import { t, type MessageKey } from '$lib/i18n/index.svelte'
  import { config } from '$lib/stores/config.svelte'
  import { project } from '$lib/stores/project.svelte'
  import { nav } from '$lib/stores/nav.svelte'

  let { paths }: { paths: readonly string[] } = $props()

  /** consecutive paths that share a group get one heading, in the order the config lists them */
  const groups = $derived.by(() => {
    const out: { group: string; paths: string[] }[] = []
    for (const p of paths) {
      const g = placementOf(p).group
      const last = out[out.length - 1]
      if (last && last.group === g) last.paths.push(p)
      else out.push({ group: g, paths: [p] })
    }
    return out
  })

  // Scroll to a setting chosen in the search box and flash it for two seconds.
  $effect(() => {
    const target = nav.focus
    if (!target || !config.loaded) return
    void tick().then(() => {
      const el = document.querySelector<HTMLElement>(`[data-path="${CSS.escape(target)}"]`)
      if (!el) return
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.classList.add('ring-2', 'ring-primary', 'rounded-xl')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-primary')
        nav.clearFocus()
      }, 2000)
    })
  })
</script>

{#if config.loading && !config.loaded}
  <p class="text-sm text-muted-foreground">{t('cfg.loading')}</p>
{:else if config.loadError}
  <div
    class="flex flex-col items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
  >
    <p>
      {#if config.loadError.code === 'no-project'}
        {t('cfg.noProject')}
      {:else if config.loadError.code === 'missing-script'}
        {t('cfg.missingScript', { script: config.loadError.error })}
      {:else}
        {t('cfg.failed', { error: config.loadError.error })}
      {/if}
    </p>
    <Button variant="outline" size="sm" onclick={() => void config.load()}>{t('cfg.retry')}</Button>
  </div>
{:else if config.loaded}
  <p class="mb-4 rounded-sm bg-warn-soft px-3 py-2 text-xs text-warn-ink">
    {t(project.bundled ? 'cfg.noteBundled' : 'cfg.draftNote', { file: config.overlayFile })}
  </p>
  <div class="space-y-8">
    {#each groups as g (g.group)}
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted-foreground">
          {t(`group.${g.group}` as MessageKey)}
        </h3>
        {#each g.paths as p (p)}
          <div data-path={p} class="transition-shadow">
            <SettingRow path={p} />
          </div>
        {/each}
      </section>
    {/each}
  </div>
{/if}
