<script lang="ts">
  import { Input } from '$lib/components/ui/input'
  import { config } from '$lib/stores/config.svelte'
  import { i18n } from '$lib/i18n/index.svelte'

  let { path }: { path: string } = $props()

  const setting = $derived(config.setting(path))
  const value = $derived(config.get(path))
  const unit = $derived(setting?.unit ?? '')
  const step = $derived(unit === 'giờ' ? 0.5 : 1)
  const invalid = $derived(path in config.errors)

  function onInput(e: Event & { currentTarget: HTMLInputElement }): void {
    const raw = e.currentTarget.value
    config.set(path, raw === '' ? null : Number(raw))
  }
</script>

<div class="flex items-center gap-2">
  <Input
    type="number"
    class="w-32 tabular-nums"
    min={0}
    {step}
    value={typeof value === 'number' ? value : ''}
    oninput={onInput}
    aria-label={i18n.settingLabel(path)}
    aria-invalid={invalid}
  />
  {#if unit}
    <span class="text-sm text-muted-foreground">{i18n.unit(unit)}</span>
  {/if}
</div>
