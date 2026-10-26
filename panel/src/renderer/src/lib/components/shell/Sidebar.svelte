<script lang="ts">
  import { mode, toggleMode } from 'mode-watcher'
  import { pathsFor } from '@shared/settings-map'
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

  // Mục hiện tại có một vạch sáng bên trái; chỉ đổi màu nền và vạch, không dịch chuyển bố cục.
  const item =
    'relative flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-3 py-2 text-left text-sm text-sidebar-foreground/80 outline-none transition-colors duration-[var(--dur-micro)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring'
  const current =
    'bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:bg-sidebar-primary'
  const heading = 'px-3 pb-1 pt-5 text-xs font-medium text-sidebar-foreground/70'
  const generalPaths = $derived(pathsFor(all, 'general'))
  const general = $derived(config.stateOf(generalPaths))
</script>

<aside
  class="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
>
  <div class="px-5 pb-3 pt-5">
    <p class="text-base font-semibold leading-tight text-sidebar-accent-foreground">
      {project.bundled ? t('app.productName') : 'Zalo Bots'}
    </p>
    <p class="mt-0.5 text-xs text-sidebar-foreground/60">{t('app.sub')}</p>
  </div>

  <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3" aria-label={t('nav.aria')}>
    <button
      class={cn(item, nav.page.name === 'home' && current)}
      aria-current={nav.page.name === 'home' ? 'page' : undefined}
      onclick={() => nav.go({ name: 'home' })}
    >
      {t('nav.home')}
    </button>

    <p class={heading}>{t('nav.bots')}</p>
    {#each project.botIds as id (id)}
      {@const dot = config.stateOf(pathsFor(all, id))}
      {@const active = nav.page.name === 'bot' && nav.page.id === id}
      <button
        class={cn(item, active && current)}
        aria-current={active ? 'page' : undefined}
        onclick={() => nav.go({ name: 'bot', id, tab: 'status' })}
      >
        <span class="flex-1 truncate">{botName(id)}</span>
        {#if dot.error}<span class="text-xs text-tail-error">{t('side.invalid')}</span
          >{:else if dot.dirty}<span class="text-xs text-tail-warn">{t('side.unsaved')}</span>{/if}
        <StatusDot state={status.shown(id)} label={t(`state.${status.shown(id)}`)} />
      </button>
    {/each}

    {#if !project.bundled}
      <p class={heading}>{t('nav.jobs')}</p>
      <button
        class={cn(item, nav.page.name === 'jobs' && current)}
        aria-current={nav.page.name === 'jobs' ? 'page' : undefined}
        onclick={() => nav.go({ name: 'jobs' })}
      >
        {t('nav.jobs')}
      </button>
    {/if}
    <button
      class={cn(item, 'mt-3', nav.page.name === 'general' && current)}
      aria-current={nav.page.name === 'general' ? 'page' : undefined}
      onclick={() => nav.go({ name: 'general', tab: 'project' })}
    >
      <span class="flex-1">{t('nav.general')}</span>
      {#if general.error}<span class="text-xs text-tail-error">{t('side.invalid')}</span
        >{:else if general.dirty}<span class="text-xs text-tail-warn">{t('side.unsaved')}</span
        >{/if}
    </button>
  </nav>

  <div class="space-y-3 border-t border-sidebar-border p-4">
    <p class="flex items-center gap-2 text-xs text-sidebar-foreground/80">
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
    </p>
    {#if !project.bundled}
      <p class="truncate text-xs text-sidebar-foreground/60" title={project.dir ?? ''}>
        {t('side.project')}: {folder}
      </p>
    {/if}
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="h-8 whitespace-nowrap rounded-sm border border-sidebar-border px-3 text-xs text-sidebar-foreground transition-colors duration-[var(--dur-micro)] hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label={t(dark ? 'tools.theme.toLight' : 'tools.theme.toDark')}
        title={t(dark ? 'tools.theme.toLight' : 'tools.theme.toDark')}
        onclick={toggleMode}
      >
        {t(dark ? 'tools.themeLabel.dark' : 'tools.themeLabel.light')}
      </button>
      <div
        class="ml-auto inline-flex rounded-sm border border-sidebar-border"
        role="group"
        aria-label={t('tools.lang')}
      >
        {#each ['vi', 'en'] as const as code (code)}
          <button
            type="button"
            class={cn(
              'h-8 min-w-9 px-2 text-xs font-medium transition-colors duration-[var(--dur-micro)] focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              i18n.lang === code
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent'
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
