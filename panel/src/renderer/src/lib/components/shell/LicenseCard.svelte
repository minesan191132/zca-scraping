<script lang="ts">
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'
  import type { LicenseInfo } from '@shared/ipc'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { t } from '$lib/i18n/index.svelte'
  import { license } from '$lib/stores/license.svelte'

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

<Card.Root>
  <Card.Content>
    <div class="flex flex-wrap items-center gap-4">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold">{t('license.title')}</p>
        {#if license.error}
          <p class="text-sm text-red-600 dark:text-red-400" data-testid="license-state">
            {t('license.error')}: {license.error}
          </p>
        {:else if info}
          <p
            class={ok
              ? 'text-sm text-emerald-600 dark:text-emerald-400'
              : 'text-sm text-red-600 dark:text-red-400'}
            data-testid="license-state"
          >
            {t(`license.state.${info.state}`)}
          </p>
          {#if ok}
            <p class="text-xs text-muted-foreground">
              {info.customer} · {t('license.expires')}
              {expires}
            </p>
          {/if}
          {#if info.machineId}
            <p
              class="mt-1 truncate font-mono text-xs text-muted-foreground"
              data-testid="machine-id"
            >
              {t('license.machine')}: {info.machineId}
            </p>
          {/if}
        {:else}
          <p class="text-sm text-muted-foreground">…</p>
        {/if}
      </div>
      {#if info?.machineId}
        <Button variant="outline" size="sm" onclick={copyMachineId}>{t('license.copy')}</Button>
      {/if}
      <Button size="sm" onclick={importFile}>{t('license.import')}</Button>
    </div>
  </Card.Content>
</Card.Root>
