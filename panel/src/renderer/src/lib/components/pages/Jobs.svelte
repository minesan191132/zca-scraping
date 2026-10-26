<script lang="ts">
  import Glyph from '$lib/components/ui/glyph/Glyph.svelte'
  import { JOB_MODES, JOB_SLOTS, modeExports, type JobMode, type JobSlot } from '@shared/bots'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import { Label } from '$lib/components/ui/label'
  import LogView from '$lib/components/bot/LogView.svelte'
  import { runJob } from '$lib/actions'
  import { t } from '$lib/i18n/index.svelte'
  import { config } from '$lib/stores/config.svelte'

  let { running }: { running: boolean } = $props()

  const uid = $props.id()
  const STORAGE_KEY = 'zbots.jobs'

  interface Saved {
    mode: JobMode
    slot: JobSlot
    /** null = every set */
    sets: string[] | null
  }

  function readSaved(): Partial<Saved> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Saved>
    } catch {
      return {}
    }
  }

  const saved = readSaved()
  let mode = $state<JobMode>(
    (JOB_MODES as readonly unknown[]).includes(saved.mode) ? (saved.mode as JobMode) : 'run'
  )
  // the morning slot closes at 9:00, so before noon the morning one is the likely choice
  let slot = $state<JobSlot>(
    (JOB_SLOTS as readonly unknown[]).includes(saved.slot)
      ? (saved.slot as JobSlot)
      : new Date().getHours() < 12
        ? 'morning'
        : 'afternoon'
  )
  let chosen = $state<string[] | null>(Array.isArray(saved.sets) ? saved.sets : null)

  // the real config, not the draft: the bots read the real one
  const setIds = $derived.by(() => {
    const raw = config.base['reportSets']
    if (!Array.isArray(raw)) return []
    return raw
      .map((s) => (s as { id?: unknown }).id)
      .filter((id): id is string => typeof id === 'string' && id !== '')
  })
  const selected = $derived(chosen === null ? setIds : setIds.filter((id) => chosen!.includes(id)))
  const allSelected = $derived(setIds.length > 0 && selected.length === setIds.length)
  const needsSets = $derived(setIds.length > 0 && selected.length === 0)

  function remember(): void {
    try {
      const value: Saved = { mode, slot, sets: allSelected ? null : selected }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // not remembered, the choice still applies for this session
    }
  }

  function toggle(id: string, on: boolean): void {
    chosen = setIds.filter((x) => (x === id ? on : selected.includes(x)))
    remember()
  }

  function toggleAll(): void {
    chosen = allSelected ? [] : null
    remember()
  }

  async function run(): Promise<void> {
    remember()
    // every set selected is sent as "none", which the bots read as every set that runs (a set that is switched off is skipped)
    const sets = allSelected ? [] : selected
    await runJob({ mode, slot, sets }, sets.length === 0 ? t('jobs.setsAll') : sets.join(', '))
  }
</script>

<div class="space-y-6">
  <p class="text-sm text-muted-foreground">{t('sub.jobs')}</p>

  <Card.Root>
    <Card.Content class="space-y-6">
      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-muted-foreground">
            {t('jobs.sets')}
          </h3>
          {#if setIds.length > 1}
            <Button variant="ghost" size="sm" onclick={toggleAll}>
              {allSelected ? t('jobs.clearAll') : t('jobs.selectAll')}
            </Button>
          {/if}
        </div>
        {#if setIds.length === 0}
          <p class="text-sm text-muted-foreground">{t('jobs.setsMissing')}</p>
        {:else}
          <div class="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-x-3 gap-y-2">
            {#each setIds as id (id)}
              <div class="flex items-center gap-2">
                <Checkbox
                  id="{uid}-set-{id}"
                  checked={selected.includes(id)}
                  onCheckedChange={(v) => toggle(id, v)}
                />
                <Label for="{uid}-set-{id}" class="cursor-pointer font-normal">{id}</Label>
              </div>
            {/each}
          </div>
          {#if needsSets}<p class="text-sm text-destructive">{t('jobs.noSet')}</p>{/if}
        {/if}
      </section>

      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted-foreground">
          {t('jobs.mode')}
        </h3>
        <div class="grid gap-3 lg:grid-cols-2" role="radiogroup" aria-label={t('jobs.mode')}>
          {#each JOB_MODES as m (m)}
            <label
              class="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors duration-[var(--dur-micro)] hover:bg-accent has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="{uid}-mode"
                value={m}
                class="sr-only"
                checked={mode === m}
                onchange={() => {
                  mode = m
                  remember()
                }}
              />
              <span class="min-w-0 font-medium">{t(`jobs.mode.${m}.name`)}</span>
            </label>
          {/each}
        </div>
      </section>

      {#if modeExports(mode)}
        <section class="space-y-3">
          <h3 class="text-sm font-semibold text-muted-foreground">
            {t('jobs.slot')}
          </h3>
          <div class="flex flex-wrap gap-3" role="radiogroup" aria-label={t('jobs.slot')}>
            {#each JOB_SLOTS as s (s)}
              <label
                class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  name="{uid}-slot"
                  value={s}
                  class="sr-only"
                  checked={slot === s}
                  onchange={() => {
                    slot = s
                    remember()
                  }}
                />
                {t(`jobs.slot.${s}`)}
              </label>
            {/each}
          </div>
        </section>
      {/if}

      <div class="flex justify-end">
        <Button disabled={running || needsSets} onclick={() => void run()}>
          {#if running}<Glyph name="spinner" class="size-4" />{/if}
          {running ? t('action.running') : t('action.run')}
        </Button>
      </div>
    </Card.Content>
  </Card.Root>

  <div class="space-y-2">
    <h3 class="text-sm font-semibold text-muted-foreground">
      {t('jobs.log')}
    </h3>
    <LogView channel="jobs" />
  </div>
</div>
