<script lang="ts">
  import Glyph from '$lib/components/ui/glyph/Glyph.svelte'
  import { toast } from 'svelte-sonner'
  import { Button } from '$lib/components/ui/button'
  import { t } from '$lib/i18n/index.svelte'
  import { config } from '$lib/stores/config.svelte'
  import { project } from '$lib/stores/project.svelte'
  import { status } from '$lib/stores/status.svelte'

  let { first = false }: { first?: boolean } = $props()

  async function choose(): Promise<void> {
    if (!(await project.choose())) return
    toast.success(t('project.saved'))
    void status.poll()
    void config.load()
  }
</script>

<div class="space-y-3">
  {#if !first}
    <h3 class="text-sm font-semibold text-muted-foreground">
      {t('project.title')}
    </h3>
    <p class="text-sm text-muted-foreground">{t('project.hint')}</p>
  {/if}
  <div class="flex flex-wrap items-center gap-3">
    {#if project.dir}
      <code class="rounded-md border bg-muted px-2.5 py-1.5 text-sm">{project.dir}</code>
    {:else if !first}
      <span class="text-sm text-muted-foreground">{t('project.none')}</span>
    {/if}
    <Button variant={first ? 'default' : 'outline'} size="sm" onclick={choose}>
      <Glyph name="folder" class="size-4" />
      {project.dir ? t('project.change') : t('project.choose')}
    </Button>
  </div>
  {#if project.rejected.length > 0}
    <p class="text-sm text-destructive">
      {t('project.missing', { scripts: project.rejected.join(', ') })}
    </p>
  {/if}
</div>
