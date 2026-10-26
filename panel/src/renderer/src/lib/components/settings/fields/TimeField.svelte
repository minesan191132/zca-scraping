<script lang="ts">
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { config } from '$lib/stores/config.svelte'
  import { i18n, t } from '$lib/i18n/index.svelte'

  let { path }: { path: string } = $props()

  const value = $derived(config.get(path))
  const text = $derived(typeof value === 'string' ? value : '')
  const invalid = $derived(path in config.errors)

  function onInput(e: Event & { currentTarget: HTMLInputElement }): void {
    config.set(path, e.currentTarget.value || null)
  }
</script>

<div class="flex items-center gap-2">
  <Input
    type="time"
    class="w-32 tabular-nums"
    value={text}
    oninput={onInput}
    aria-label={i18n.settingLabel(path)}
    aria-invalid={invalid}
  />
  <Button
    variant={text === '' ? 'secondary' : 'ghost'}
    size="sm"
    aria-pressed={text === ''}
    onclick={() => config.set(path, null)}
  >
    {t('cfg.noLimit')}
  </Button>
</div>
