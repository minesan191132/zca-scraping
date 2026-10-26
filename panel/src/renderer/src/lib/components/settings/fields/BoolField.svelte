<script lang="ts">
  import { Switch } from '$lib/components/ui/switch'
  import { Label } from '$lib/components/ui/label'
  import { config } from '$lib/stores/config.svelte'
  import { t } from '$lib/i18n/index.svelte'

  let { path }: { path: string } = $props()

  const id = $props.id()
  const on = $derived(!!config.get(path))
</script>

<div class="flex items-center gap-2">
  <Switch {id} checked={on} onCheckedChange={(v) => config.set(path, v)} />
  <Label for={id} class="min-w-8 cursor-pointer text-muted-foreground">
    {on ? t('cfg.on') : t('cfg.off')}
  </Label>
</div>
