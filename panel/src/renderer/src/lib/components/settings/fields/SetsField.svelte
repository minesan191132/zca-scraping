<script lang="ts">
  import { tick } from 'svelte'
  import Plus from '@lucide/svelte/icons/plus'
  import Trash from '@lucide/svelte/icons/trash'
  import User from '@lucide/svelte/icons/user'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import { Label } from '$lib/components/ui/label'
  import { config } from '$lib/stores/config.svelte'
  import { i18n, t } from '$lib/i18n/index.svelte'
  import { REPORT_CODES } from '@shared/setting-kinds'
  import type { ReportSet } from '@shared/validation'

  let { path }: { path: string } = $props()

  const uid = $props.id()
  const sets = $derived((config.get(path) as ReportSet[] | undefined) ?? [])
  const invalid = $derived(path in config.errors)
  const known: readonly string[] = REPORT_CODES

  function update(index: number, patch: Partial<ReportSet>): void {
    config.set(
      path,
      sets.map((s, i) => (i === index ? { ...s, ...patch } : s))
    )
  }

  function toggle(index: number, code: string, on: boolean): void {
    const current = sets[index].reports
    // display order for the known codes; codes this panel does not know are kept after them
    const reports = [
      ...REPORT_CODES.filter((c) => (c === code ? on : current.includes(c))),
      ...current.filter((c) => !known.includes(c))
    ]
    update(index, { reports })
  }

  function remove(index: number): void {
    config.set(
      path,
      sets.filter((_, i) => i !== index)
    )
  }

  async function add(): Promise<void> {
    const index = sets.length
    config.set(path, [...sets, { id: '', reports: [] }])
    // the new person has no name yet and the config cannot be saved without one, so the cursor goes straight there
    await tick()
    document.getElementById(`${uid}-name-${index}`)?.focus()
  }
</script>

<div class="flex flex-col gap-3">
  {#each sets as set, i (i)}
    <div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      <div class="flex items-center gap-2">
        <User class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          id="{uid}-name-{i}"
          type="text"
          spellcheck={false}
          placeholder={t('cfg.personName')}
          aria-label={t('cfg.personName')}
          aria-invalid={invalid}
          value={set.id}
          oninput={(e) => update(i, { id: e.currentTarget.value })}
        />
        <span class="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
          {t('cfg.reportCount', { n: set.reports.length, m: REPORT_CODES.length })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('cfg.deletePerson')}
          title={t('cfg.deletePerson')}
          onclick={() => remove(i)}
        >
          <Trash />
        </Button>
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-x-3 gap-y-2">
        {#each REPORT_CODES as code (code)}
          <div class="flex items-center gap-2">
            <Checkbox
              id="{uid}-{i}-{code}"
              checked={set.reports.includes(code)}
              onCheckedChange={(v) => toggle(i, code, v)}
            />
            <Label for="{uid}-{i}-{code}" class="cursor-pointer font-normal">
              {i18n.reportLabel(code)}
            </Label>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p class="text-sm text-muted-foreground">{t('cfg.noPeople')}</p>
  {/each}
  <div>
    <Button variant="outline" size="sm" onclick={add}>
      <Plus />
      {t('cfg.addPerson')}
    </Button>
  </div>
</div>
