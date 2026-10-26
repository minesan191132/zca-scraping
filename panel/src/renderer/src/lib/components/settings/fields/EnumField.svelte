<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { config } from '$lib/stores/config.svelte'
  import { i18n } from '$lib/i18n/index.svelte'
  import { ENUMS } from '@shared/setting-kinds'

  let { path }: { path: string } = $props()

  const options = $derived(ENUMS[path] ?? [])
  const current = $derived(config.get(path))
</script>

<div role="group" aria-label={i18n.settingLabel(path)} class="inline-flex flex-wrap gap-1">
  {#each options as option (option)}
    <Button
      variant={current === option ? 'default' : 'outline'}
      size="sm"
      aria-pressed={current === option}
      onclick={() => config.set(path, option)}
    >
      {i18n.enumLabel(path, option)}
    </Button>
  {/each}
</div>
