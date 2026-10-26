<script lang="ts">
  import Search from '@lucide/svelte/icons/search'
  import { Input } from '$lib/components/ui/input'
  import { i18n, t } from '$lib/i18n/index.svelte'
  import { config } from '$lib/stores/config.svelte'
  import { nav } from '$lib/stores/nav.svelte'

  let query = $state('')
  let open = $state(false)

  const fold = (s: string): string =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase()

  const results = $derived.by(() => {
    const q = fold(query.trim())
    if (!q) return []
    return config.settings
      .filter((s) =>
        fold(`${i18n.settingLabel(s.path)} ${s.path} ${i18n.settingNote(s.path, s.note)}`).includes(
          q
        )
      )
      .slice(0, 8)
  })

  function pick(path: string): void {
    nav.reveal(path)
    query = ''
    open = false
  }
</script>

<div class="relative w-72">
  <Search
    class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
  />
  <Input
    type="search"
    class="rounded-full pl-9"
    placeholder={t('cfg.search')}
    bind:value={query}
    onfocus={() => (open = true)}
    onblur={() => setTimeout(() => (open = false), 150)}
    disabled={!config.loaded}
  />
  {#if open && query.trim()}
    <div
      class="absolute right-0 top-full z-30 mt-1 w-96 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
    >
      {#if results.length === 0}
        <p class="px-3 py-2 text-sm text-muted-foreground">{t('cfg.noResults')}</p>
      {:else}
        <ul>
          {#each results as s (s.path)}
            <li>
              <button
                type="button"
                class="w-full px-3 py-2 text-left hover:bg-accent"
                onmousedown={() => pick(s.path)}
              >
                <span class="block text-sm font-medium">{i18n.settingLabel(s.path)}</span>
                <code class="text-xs text-muted-foreground">{s.path}</code>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
