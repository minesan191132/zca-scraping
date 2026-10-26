<script lang="ts">
  import { Input } from '$lib/components/ui/input'
  import { config } from '$lib/stores/config.svelte'
  import { i18n, t } from '$lib/i18n/index.svelte'
  import { WIDE_TEXT } from '@shared/setting-kinds'

  let { path }: { path: string } = $props()

  const value = $derived(config.get(path))
  const wide = $derived(WIDE_TEXT.has(path))
  const invalid = $derived(path in config.errors)

  function onInput(e: Event & { currentTarget: HTMLInputElement }): void {
    const raw = e.currentTarget.value
    config.set(path, path === 'zaloExePath' && raw === '' ? null : raw)
  }
</script>

<Input
  type="text"
  class={wide ? 'w-full font-mono' : 'w-full max-w-sm'}
  spellcheck={false}
  value={typeof value === 'string' ? value : ''}
  placeholder={path === 'zaloExePath' ? t('cfg.autoDetect') : undefined}
  oninput={onInput}
  aria-label={i18n.settingLabel(path)}
  aria-invalid={invalid}
/>
