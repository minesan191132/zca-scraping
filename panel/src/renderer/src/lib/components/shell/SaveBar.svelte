<script lang="ts">
  import Info from '@lucide/svelte/icons/info'
  import Save from '@lucide/svelte/icons/save'
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert'
  import Undo2 from '@lucide/svelte/icons/undo-2'
  import { toast } from 'svelte-sonner'
  import { BOT_IDS, type BotId } from '@shared/bots'
  import * as AlertDialog from '$lib/components/ui/alert-dialog'
  import { Button } from '$lib/components/ui/button'
  import { i18n, t, type MessageKey } from '$lib/i18n/index.svelte'
  import { config, type Change } from '$lib/stores/config.svelte'
  import { project } from '$lib/stores/project.svelte'
  import { nav } from '$lib/stores/nav.svelte'

  const onSettingsPage = $derived(
    (nav.page.name === 'bot' && nav.page.tab === 'settings') ||
      (nav.page.name === 'general' && nav.page.tab !== 'project')
  )
  const count = $derived(config.dirty.length)
  const errors = $derived(Object.keys(config.errors).length)
  // the first problem, named, so the user does not have to hunt for the red text on the page
  const firstError = $derived.by(() => {
    const [path, err] = Object.entries(config.errors)[0] ?? []
    return path && err ? `${i18n.settingLabel(path)}: ${t(err.key as MessageKey)}` : ''
  })
  const visible = $derived(onSettingsPage && count > 0)

  let report = $state<{
    changes: Change[]
    bots: string[]
    file: string
    warnings: string[]
  } | null>(null)

  // readers also include commands such as bot:scrape that have no page of their own
  const botName = (b: string): string =>
    (BOT_IDS as readonly string[]).includes(b) ? botName(b as BotId) : b
  const show = (v: unknown): string =>
    typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)

  async function save(): Promise<void> {
    try {
      const r = await config.save()
      toast.success(
        t(project.bundled ? 'toast.savedBundled' : 'toast.saved', { n: r.changes.length })
      )
      // Cảnh báo của chính bot (dòng `[config] ...`): danh sách nhóm còn rỗng là chuyện bình thường trước khi thiết lập xong nên chỉ báo nhẹ.
      for (const w of r.warnings) (/targets đang rỗng/.test(w) ? toast.info : toast.warning)(w)
      report = r
    } catch (e) {
      toast.error(t('toast.saveFailed', { error: e instanceof Error ? e.message : String(e) }))
    }
  }
</script>

{#if visible}
  <div class="pointer-events-none absolute inset-x-6 bottom-5 z-20 flex justify-center">
    <div
      class="pointer-events-auto flex w-full max-w-5xl items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg ring-1 ring-amber-500/30"
    >
      <span class="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        {#if errors > 0}<TriangleAlert class="size-4" />{:else}<Info class="size-4" />{/if}
        {errors > 0
          ? t('save.pendingErr', { n: count, e: errors })
          : t('save.pending', { n: count })}
      </span>
      {#if firstError}
        <span
          class="min-w-0 flex-1 truncate text-sm text-destructive"
          role="alert"
          title={firstError}
        >
          {firstError}
        </span>
      {:else}
        <div class="flex-1"></div>
      {/if}
      <Button
        variant="ghost"
        size="sm"
        onclick={() => {
          config.revertAll()
          toast.info(t('toast.undone'))
        }}
      >
        <Undo2 />
        {t('save.undoAll')}
      </Button>
      <Button size="sm" disabled={errors > 0} onclick={save}
        ><Save /> {t(project.bundled ? 'save.saveBundled' : 'save.save')}</Button
      >
    </div>
  </div>
{/if}

<AlertDialog.Root open={report !== null} onOpenChange={(open) => !open && (report = null)}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title
        >{t(project.bundled ? 'save.savedTitleBundled' : 'save.savedTitle')}</AlertDialog.Title
      >
      <AlertDialog.Description>
        {report && report.bots.length > 0
          ? t('modal.restart', { names: report.bots.map(botName).join(', ') })
          : t('modal.noRestart')}
      </AlertDialog.Description>
    </AlertDialog.Header>
    {#if report}
      <ul class="max-h-64 space-y-1.5 overflow-y-auto text-sm">
        {#each report.changes as c (c.path)}
          <li class="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-1.5">
            <span class="font-medium">{i18n.settingLabel(c.path)}</span>
            <span class="flex min-w-0 items-center gap-2 text-muted-foreground">
              <s class="max-w-36 truncate">{show(c.from)}</s>
              <span>→</span>
              <b class="max-w-44 truncate text-foreground">{show(c.to)}</b>
            </span>
          </li>
        {/each}
      </ul>
      <p class="text-xs text-muted-foreground">{t('modal.wrote', { file: report.file })}</p>
    {/if}
    <!-- AlertDialog.Action does not close the dialog by itself (only Cancel does), so it clears the report here -->
    <AlertDialog.Footer
      ><AlertDialog.Action onclick={() => (report = null)}>{t('modal.ok')}</AlertDialog.Action
      ></AlertDialog.Footer
    >
  </AlertDialog.Content>
</AlertDialog.Root>
