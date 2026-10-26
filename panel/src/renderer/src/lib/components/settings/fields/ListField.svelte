<script lang="ts">
  import X from '@lucide/svelte/icons/x'
  import { Input } from '$lib/components/ui/input'
  import { config } from '$lib/stores/config.svelte'
  import { i18n, t } from '$lib/i18n/index.svelte'
  import { SUGGEST_TARGETS } from '@shared/setting-kinds'

  let { path }: { path: string } = $props()

  const listId = $props.id()
  const items = $derived((config.get(path) as string[] | undefined) ?? [])
  const suggestions = $derived(
    SUGGEST_TARGETS.has(path) ? ((config.get('targets') as string[] | undefined) ?? []) : []
  )
  // The text typed in the box and not yet added is the only state this field keeps.
  let draft = $state('')

  function add(): void {
    const v = draft.trim().replace(/,$/, '').trim()
    draft = ''
    if (v && !items.includes(v)) config.set(path, [...items, v])
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.isComposing) return
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    }
  }

  function remove(index: number): void {
    config.set(
      path,
      items.filter((_, i) => i !== index)
    )
  }
</script>

<div class="flex flex-col gap-2">
  {#if items.length}
    <ul class="flex flex-wrap gap-1.5" aria-label={i18n.settingLabel(path)}>
      {#each items as item, i (i)}
        <li
          class="inline-flex items-center gap-1 rounded-full border bg-secondary py-0.5 pr-1 pl-2.5 text-sm text-secondary-foreground"
        >
          <span class="break-all">{item}</span>
          <button
            type="button"
            class="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="{t('cfg.remove')}: {item}"
            title={t('cfg.remove')}
            onclick={() => remove(i)}
          >
            <X class="size-3" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <Input
    type="text"
    spellcheck={false}
    placeholder={t('cfg.addHint')}
    bind:value={draft}
    onkeydown={onKeydown}
    onblur={add}
    list={suggestions.length ? listId : undefined}
    aria-label={i18n.settingLabel(path)}
    aria-invalid={path in config.errors}
  />
  {#if suggestions.length}
    <datalist id={listId}>
      {#each suggestions as name, i (i)}
        <option value={name}></option>
      {/each}
    </datalist>
  {/if}
</div>
