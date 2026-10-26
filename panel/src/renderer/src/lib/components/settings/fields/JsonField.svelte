<script lang="ts">
  import { Textarea } from '$lib/components/ui/textarea'
  import { config } from '$lib/stores/config.svelte'
  import { i18n } from '$lib/i18n/index.svelte'

  let { path }: { path: string } = $props()

  const stored = $derived(config.get(path))
  const bad = $derived(config.jsonBad.has(path))

  const pretty = (v: unknown): string => JSON.stringify(v, null, 2) ?? ''
  const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

  // The text being typed is the only state kept here. While it parses, the store follows it; when the store changes
  // by itself (undo, default) and the text no longer matches, the text is rewritten from the store.
  let text = $state(pretty(config.get(path)))
  $effect(() => {
    if (bad) return
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      text = pretty(stored)
      return
    }
    if (!sameJson(parsed, stored)) text = pretty(stored)
  })

  function onInput(): void {
    try {
      const v: unknown = JSON.parse(text)
      config.markJsonBad(path, false)
      config.set(path, v)
    } catch {
      config.markJsonBad(path, true)
    }
  }
</script>

<Textarea
  class="min-h-24 w-full font-mono text-xs"
  spellcheck={false}
  rows={4}
  bind:value={text}
  oninput={onInput}
  aria-label={i18n.settingLabel(path)}
  aria-invalid={bad || path in config.errors}
/>
