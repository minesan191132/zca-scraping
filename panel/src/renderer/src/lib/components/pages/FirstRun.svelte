<script lang="ts">
  import * as Card from '$lib/components/ui/card'
  import { t } from '$lib/i18n/index.svelte'
  import ProjectPicker from './ProjectPicker.svelte'
</script>

<div class="flex min-h-[60vh] items-center justify-center">
  <Card.Root class="w-full max-w-lg">
    <Card.Header>
      <Card.Title class="text-lg">{t('firstrun.title')}</Card.Title>
      <Card.Description>{t('firstrun.body')}</Card.Description>
    </Card.Header>
    <Card.Content><ProjectPicker first /></Card.Content>
  </Card.Root>
</div>
