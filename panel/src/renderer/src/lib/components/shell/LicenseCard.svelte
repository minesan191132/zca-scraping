<script lang="ts">
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'
  import type { LicenseInfo } from '@shared/ipc'
  import { Button } from '$lib/components/ui/button'
  import { t } from '$lib/i18n/index.svelte'
  import { license } from '$lib/stores/license.svelte'
  import { cn } from '$lib/utils'
  import StatusDot from './StatusDot.svelte'

  const info = $derived(license.info)
  const ok = $derived(info?.state === 'ok')
  const expires = $derived(
    info?.expiresAt ? new Date(info.expiresAt).toLocaleDateString('vi-VN') : ''
  )

  onMount(() => void license.refresh())

  async function importFile(): Promise<void> {
    try {
      const next = await license.importFromDialog()
      if (next) toast[next.state === 'ok' ? 'success' : 'error'](t(`license.state.${next.state}`))
    } catch (e) {
      const m = /license-rejected:([a-z-]+)/.exec((e as Error).message)
      toast.error(t('license.importFailed'), {
        description: m ? t(`license.state.${m[1] as LicenseInfo['state']}`) : (e as Error).message
      })
    }
  }

  async function copyMachineId(): Promise<void> {
    if (!info?.machineId) return
    await navigator.clipboard.writeText(info.machineId)
    toast.info(t('license.copied'))
  }
</script>

<!-- Dải giấy phép: một hàng phẳng, không thẻ. Chữ trạng thái đứng cạnh ô vuông màu nên màu không phải là thông tin duy nhất. -->
<section
  class={cn(
    'flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border px-4 py-3 transition-colors duration-[var(--dur-short)]',
    ok ? 'bg-card' : 'border-dead/40 bg-dead-soft'
  )}
>
  <div class="min-w-0 flex-1">
    <p class="flex items-center gap-2 text-sm font-medium" data-testid="license-state">
      <StatusDot state={license.error ? 'dead' : ok ? 'alive' : info ? 'dead' : 'loading'} />
      {#if license.error}
        {t('license.error')}: {license.error}
      {:else if info}
        {t(`license.state.${info.state}`)}
      {:else}
        …
      {/if}
    </p>
    {#if ok}
      <p class="mt-0.5 text-xs text-muted-foreground">
        {info?.customer}, {t('license.expires')}
        <span class="num">{expires}</span>
      </p>
    {/if}
    {#if info?.machineId}
      <p class="mt-1 truncate font-mono text-xs text-muted-foreground" data-testid="machine-id">
        {t('license.machine')}: {info.machineId}
      </p>
    {/if}
  </div>
  {#if info?.machineId}
    <Button variant="outline" size="sm" onclick={copyMachineId}>{t('license.copy')}</Button>
  {/if}
  <Button size="sm" onclick={importFile}>{t('license.import')}</Button>
</section>
