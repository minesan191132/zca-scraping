<script lang="ts">
  import Eye from '@lucide/svelte/icons/eye'
  import FileText from '@lucide/svelte/icons/file-text'
  import MessageSquare from '@lucide/svelte/icons/message-square'
  import Play from '@lucide/svelte/icons/play'
  import type { BotId } from '@shared/bots'

  let { id, class: className }: { id: BotId; class?: string } = $props()
</script>

{#if id === 'watch'}
  <Eye class={className} />
{:else if id === 'runner'}
  <Play class={className} />
{:else if id === 'chat'}
  <MessageSquare class={className} />
{:else}
  <FileText class={className} />
{/if}
