<script lang="ts">
  import Glyph from '$lib/components/ui/glyph/Glyph.svelte'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { config } from '$lib/stores/config.svelte'
  import { t } from '$lib/i18n/index.svelte'

  let { path }: { path: string } = $props()

  type Pair = { key: string; value: string }
  const listId = $props.id()

  const stored = $derived((config.get(path) as Record<string, string> | undefined) ?? {})
  const targets = $derived((config.get('targets') as string[] | undefined) ?? [])
  const invalid = $derived(path in config.errors)

  const toPairs = (o: Record<string, string>): Pair[] =>
    Object.entries(o).map(([key, value]) => ({ key, value }))
  const toObject = (list: Pair[]): Record<string, string> =>
    Object.fromEntries(
      list.filter((p) => p.key.trim() && p.value.trim()).map((p) => [p.key.trim(), p.value.trim()])
    )

  // The rows being typed: half-filled rows cannot live in the config value, so they are kept here.
  // The store stays the source of truth: when it no longer equals what the rows produce (undo, default), the rows are rebuilt.
  let pairs = $state<Pair[]>(toPairs(stored))
  $effect(() => {
    if (JSON.stringify(toObject(pairs)) !== JSON.stringify(stored)) pairs = toPairs(stored)
  })

  function commit(): void {
    config.set(path, toObject(pairs))
  }

  function setPair(index: number, field: keyof Pair, text: string): void {
    pairs[index][field] = text
    commit()
  }

  function remove(index: number): void {
    pairs = pairs.filter((_, i) => i !== index)
    commit()
  }
</script>

<div class="flex flex-col gap-2">
  {#each pairs as pair, i (i)}
    <div class="flex items-center gap-2">
      <Input
        type="text"
        spellcheck={false}
        placeholder={t('cfg.aliasKey')}
        aria-label={t('cfg.aliasKey')}
        aria-invalid={invalid}
        list={listId}
        value={pair.key}
        oninput={(e) => setPair(i, 'key', e.currentTarget.value)}
      />
      <span class="text-muted-foreground" aria-hidden="true">→</span>
      <Input
        type="text"
        spellcheck={false}
        placeholder={t('cfg.aliasVal')}
        aria-label={t('cfg.aliasVal')}
        value={pair.value}
        oninput={(e) => setPair(i, 'value', e.currentTarget.value)}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('cfg.delete')}
        title={t('cfg.delete')}
        onclick={() => remove(i)}
      >
        <Glyph name="trash" class="size-3.5" />
      </Button>
    </div>
  {:else}
    <p class="text-sm text-muted-foreground">{t('cfg.noAlias')}</p>
  {/each}
  <div>
    <Button variant="outline" size="sm" onclick={() => pairs.push({ key: '', value: '' })}>
      <Glyph name="plus" class="size-3.5" />
      {t('cfg.addAlias')}
    </Button>
  </div>
  <datalist id={listId}>
    {#each targets as name, i (i)}
      <option value={name}></option>
    {/each}
  </datalist>
</div>
