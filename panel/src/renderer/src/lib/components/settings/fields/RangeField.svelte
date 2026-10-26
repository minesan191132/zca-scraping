<script lang="ts">
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { config } from '$lib/stores/config.svelte'
  import { i18n, t } from '$lib/i18n/index.svelte'
  import type { MessageKey } from '$lib/i18n/index.svelte'

  let { path }: { path: string } = $props()

  const id = $props.id()
  type Bound = 'min' | 'max'
  const bounds: readonly { key: Bound; label: MessageKey }[] = [
    { key: 'min', label: 'cfg.min' },
    { key: 'max', label: 'cfg.max' }
  ]

  const value = $derived((config.get(path) ?? {}) as Partial<Record<Bound, number | null>>)
  const unit = $derived(config.setting(path)?.unit ?? '')
  const invalid = $derived(path in config.errors)

  function onInput(key: Bound, e: Event & { currentTarget: HTMLInputElement }): void {
    const raw = e.currentTarget.value
    config.set(path, { ...value, [key]: raw === '' ? null : Number(raw) })
  }
</script>

<div class="flex flex-wrap items-center gap-3">
  {#each bounds as b (b.key)}
    <div class="flex items-center gap-2">
      <Label for="{id}-{b.key}" class="font-normal text-muted-foreground">{t(b.label)}</Label>
      <Input
        id="{id}-{b.key}"
        type="number"
        class="w-24 tabular-nums"
        min={0}
        value={typeof value[b.key] === 'number' ? value[b.key] : ''}
        oninput={(e) => onInput(b.key, e)}
        aria-invalid={invalid}
      />
    </div>
  {/each}
  {#if unit}
    <span class="text-sm text-muted-foreground">{i18n.unit(unit)}</span>
  {/if}
</div>
