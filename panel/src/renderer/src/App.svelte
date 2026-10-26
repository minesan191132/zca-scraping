<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { fly } from 'svelte/transition'
  import { ModeWatcher, mode } from 'mode-watcher'
  import { toast } from 'svelte-sonner'
  import { Toaster } from '$lib/components/ui/sonner'
  import BotPage from '$lib/components/pages/BotPage.svelte'
  import FirstRun from '$lib/components/pages/FirstRun.svelte'
  import General from '$lib/components/pages/General.svelte'
  import Home from '$lib/components/pages/Home.svelte'
  import Jobs from '$lib/components/pages/Jobs.svelte'
  import ConfirmHost from '$lib/components/shell/ConfirmHost.svelte'
  import SaveBar from '$lib/components/shell/SaveBar.svelte'
  import SearchBox from '$lib/components/shell/SearchBox.svelte'
  import Sidebar from '$lib/components/shell/Sidebar.svelte'
  import { i18n, t } from '$lib/i18n/index.svelte'
  import { DUR_SHORT, ms } from '$lib/motion'
  import { config } from '$lib/stores/config.svelte'
  import { logs } from '$lib/stores/logs.svelte'
  import { nav } from '$lib/stores/nav.svelte'
  import { project } from '$lib/stores/project.svelte'
  import { POLL_MS, status } from '$lib/stores/status.svelte'

  let jobRunning = $state(false)

  const page = $derived(nav.page)
  const needsProject = $derived(project.loaded && project.dir === null)

  onMount(() => {
    i18n.init()
    void project.refresh()
    const off = [
      window.api.onLog(({ channel, line }) => logs.push(channel, line)),
      window.api.onBotExit(() => void status.poll()),
      window.api.onUpdateDownloaded(({ version }) =>
        toast.info(t('update.downloaded', { version }), { duration: 15000 })
      ),
      window.api.onJobState(({ running }) => {
        jobRunning = running
        if (!running) void status.poll()
      })
    ]
    const timer = setInterval(() => {
      if (project.dir) void status.poll()
    }, POLL_MS)
    return () => {
      off.forEach((f) => f())
      clearInterval(timer)
    }
  })

  // Once a project folder is known (first run, a change on the General page, or a saved choice), read status and settings.
  $effect(() => {
    if (!project.dir) return
    untrack(() => {
      void status.poll()
      void config.load()
    })
  })

  $effect(() => {
    document.title = project.bundled ? t('app.productName') : t('app.title')
  })

  // The main process tints the window background and the native dialogs to match the theme.
  $effect(() => {
    if (mode.current) void window.api.setTheme(mode.current)
  })

  // The screenshot test hook waits for this.
  $effect(() => {
    window.__panelReady =
      needsProject || (status.loaded && (config.loaded || config.loadError !== null))
  })

  const titleKey = $derived(
    page.name === 'jobs' ? 'title.jobs' : page.name === 'general' ? 'title.general' : 'title.home'
  )
</script>

<ModeWatcher />
<Toaster richColors position="top-right" />
<ConfirmHost />

{#if needsProject}
  <main class="min-h-screen bg-background p-6 text-foreground"><FirstRun /></main>
{:else}
  <div class="flex h-screen bg-background text-foreground">
    <Sidebar />
    <div class="relative flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 shrink-0 items-center gap-4 border-b px-8">
        <h1 class="flex-1 text-lg font-semibold">{page.name === 'bot' ? '' : t(titleKey)}</h1>
        <SearchBox />
      </header>
      <main class="flex-1 overflow-y-auto px-8 py-7 pb-28">
        <div class="mx-auto max-w-5xl">
          {#key page.name}
            <div in:fly={{ y: 6, duration: ms(DUR_SHORT) }}>
              {#if page.name === 'home'}
                <Home />
              {:else if page.name === 'bot'}
                {#key page.id}
                  <BotPage id={page.id} tab={page.tab} />
                {/key}
              {:else if page.name === 'jobs'}
                <Jobs running={jobRunning} />
              {:else}
                <General tab={page.tab} />
              {/if}
            </div>
          {/key}
        </div>
      </main>
      <SaveBar />
    </div>
  </div>
{/if}
