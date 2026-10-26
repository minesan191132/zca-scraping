<script lang="ts">
  import Glyph from '../glyph/Glyph.svelte'
  import { mode } from 'mode-watcher'
  import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner'

  let { ...restProps }: SonnerProps = $props()
</script>

<Sonner
  theme={mode.current}
  class="toaster group"
  style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
  toastOptions={{
    classes: {
      toast: 'cn-toast'
    }
  }}
  {...restProps}
>
  {#snippet loadingIcon()}
    <Glyph name="spinner" />
  {/snippet}
  {#snippet successIcon()}
    <Glyph name="ok" />
  {/snippet}
  {#snippet errorIcon()}
    <Glyph name="fail" />
  {/snippet}
  {#snippet infoIcon()}
    <Glyph name="info" />
  {/snippet}
  {#snippet warningIcon()}
    <Glyph name="alert" />
  {/snippet}
</Sonner>
