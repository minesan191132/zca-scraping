<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog'
  import { buttonVariants } from '$lib/components/ui/button'
  import { confirmState } from '$lib/stores/confirm.svelte'
  import { t } from '$lib/i18n/index.svelte'

  const current = $derived(confirmState.current)
</script>

<AlertDialog.Root
  open={current !== null}
  onOpenChange={(open) => {
    if (!open) confirmState.answer(false)
  }}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{current?.title}</AlertDialog.Title>
      <AlertDialog.Description>{current?.body}</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => confirmState.answer(false)}
        >{t('confirm.cancel')}</AlertDialog.Cancel
      >
      <AlertDialog.Action
        class={current?.danger ? buttonVariants({ variant: 'destructive' }) : undefined}
        onclick={() => confirmState.answer(true)}
      >
        {t('confirm.ok')}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
