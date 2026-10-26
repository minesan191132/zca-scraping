<script lang="ts">
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard'
  import MessageCircle from '@lucide/svelte/icons/message-circle'
  import Moon from '@lucide/svelte/icons/moon'
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal'
  import Sun from '@lucide/svelte/icons/sun'
  import Wrench from '@lucide/svelte/icons/wrench'
  import { mode, toggleMode } from 'mode-watcher'
  import { pathsFor } from '@shared/settings-map'
  import { Button } from '$lib/components/ui/button'
  import BotIcon from '$lib/components/bot/BotIcon.svelte'
  import StatusDot from '$lib/components/shell/StatusDot.svelte'
  import { botName } from '$lib/bot-text'
  import { i18n, t } from '$lib/i18n/index.svelte'
  import { config } from '$lib/stores/config.svelte'
  import { nav } from '$lib/stores/nav.svelte'
  import { project } from '$lib/stores/project.svelte'
  import { status } from '$lib/stores/status.svelte'
  import { cn } from '$lib/utils'

  const all = $derived(config.settings.map((x) => x.path))
  const dark = $derived(mode.current === 'dark')
  const counts = $derived(status.counts())
  const folder = $derived(
    project.dir
      ? (project.dir.split(/[\\/]/).filter(Boolean).pop() ?? project.dir)
      : t('side.noProject')
  )

  const item =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50'
  const generalPaths = $derived(pathsFor(all, 'general'))
  const general = $derived(config.stateOf(generalPaths))
</script>

<aside class="flex w-64 shrink-0 flex-col border-r bg-muted/40">
  <div class="flex items-center gap-3 px-4 py-4">
    <span
      class="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      ><MessageCircle class="size-5" /></span
    >
    <div class="leading-tight">
      <p class="font-semibold">{project.bundled ? t('app.productName') : 'Zalo Bots'}</p>
      <p class="text-xs text-muted-foreground">{t('app.sub')}</p>
    </div>
  </div>

  <nav class="flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label={t('nav.aria')}>
    <button
      class={cn(item, nav.page.name === 'home' && 'bg-accent font-medium')}
      onclick={() => nav.go({ name: 'home' })}
    >
      <LayoutDashboard class="size-4" />
      {t('nav.home')}
    </button>

    <p class="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {t('nav.bots')}
    </p>
    {#each project.botIds as id (id)}
      {@const dot = config.stateOf(pathsFor(all, id))}
      <button
        class={cn(item, nav.page.name === 'bot' && nav.page.id === id && 'bg-accent font-medium')}
        onclick={() => nav.go({ name: 'bot', id, tab: 'status' })}
      >
        <BotIcon {id} class="size-4" />
        <span class="flex-1 truncate">{botName(id)}</span>
        {#if dot.error}<span class="size-2 rounded-full bg-red-500" title={t('save.dirtyDot')}
          ></span>{:else if dot.dirty}<span
            class="size-2 rounded-full bg-amber-500"
            title={t('save.dirtyDot')}
          ></span>{/if}
        <StatusDot state={status.shown(id)} />
      </button>
    {/each}

    {#if !project.bundled}
      <p class="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('nav.jobs')}
      </p>
      <button
        class={cn(item, nav.page.name === 'jobs' && 'bg-accent font-medium')}
        onclick={() => nav.go({ name: 'jobs' })}
      >
        <Wrench class="size-4" />
        {t('nav.jobs')}
      </button>
    {/if}
    <button
      class={cn(item, nav.page.name === 'general' && 'bg-accent font-medium')}
      onclick={() => nav.go({ name: 'general', tab: 'project' })}
    >
      <SlidersHorizontal class="size-4" />
      <span class="flex-1">{t('nav.general')}</span>
      {#if general.error}<span class="size-2 rounded-full bg-red-500"
        ></span>{:else if general.dirty}<span class="size-2 rounded-full bg-amber-500"></span>{/if}
    </button>
  </nav>

  <div class="space-y-3 border-t p-3">
    <div class="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs">
      <StatusDot
        state={!status.loaded
          ? 'loading'
          : counts.running === project.botIds.length
            ? 'alive'
            : counts.problems > 0
              ? 'dead'
              : 'warn'}
      />
      <span class="truncate"
        >{status.loaded
          ? t('foot.running', { alive: counts.running, total: project.botIds.length })
          : t('foot.checking')}</span
      >
    </div>
    {#if !project.bundled}
      <p class="truncate px-1 text-xs text-muted-foreground" title={project.dir ?? ''}>
        {t('side.project')}: {folder}
      </p>
    {/if}
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-label={t(dark ? 'tools.theme.toLight' : 'tools.theme.toDark')}
        title={t(dark ? 'tools.theme.toLight' : 'tools.theme.toDark')}
        onclick={toggleMode}
      >
        {#if dark}<Moon />{:else}<Sun />{/if}
        {t(dark ? 'tools.themeLabel.dark' : 'tools.themeLabel.light')}
      </Button>
      <div
        class="ml-auto inline-flex rounded-lg border p-0.5"
        role="group"
        aria-label={t('tools.lang')}
      >
        {#each ['vi', 'en'] as const as code (code)}
          <button
            type="button"
            class={cn(
              'h-7 min-w-9 rounded-md px-2 text-xs font-semibold transition-colors',
              i18n.lang === code
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={i18n.lang === code}
            onclick={() => i18n.setLang(code)}
          >
            {code.toUpperCase()}
          </button>
        {/each}
      </div>
    </div>
  </div>
</aside>
