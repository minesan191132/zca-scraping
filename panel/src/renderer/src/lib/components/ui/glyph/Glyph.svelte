<script lang="ts">
  // Bộ ký hiệu riêng của panel: lưới 24, nét 2, đầu nét vuông, góc nhọn. Chỉ dùng cho hành động và trạng thái; chỗ khác dùng chữ.
  export type GlyphName =
    | 'play'
    | 'stop'
    | 'refresh'
    | 'trash'
    | 'plus'
    | 'minus'
    | 'x'
    | 'check'
    | 'alert'
    | 'info'
    | 'search'
    | 'undo'
    | 'folder'
    | 'spinner'
    | 'fail'
    | 'ok'

  const PATHS: Record<GlyphName, string> = {
    play: 'M7 5v14l11-7z',
    stop: 'M6 6h12v12H6z',
    refresh: 'M19 12a7 7 0 1 1-2.1-5M19 4v4h-4',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    x: 'M6 6l12 12M18 6L6 18',
    check: 'M5 12l5 5L19 7',
    alert: 'M12 4l9 16H3zM12 10v4.5M12 17.5v.5',
    info: 'M12 4a8 8 0 1 0 .01 0zM12 11v6M12 7.5v.5',
    search: 'M10.5 4a6.5 6.5 0 1 0 .01 0zM15.5 15.5L20 20',
    undo: 'M9 6L4 11l5 5M4 11h10a5 5 0 0 1 0 10h-3',
    folder: 'M3 6h6l2 2h10v11H3z',
    spinner: 'M12 3a9 9 0 1 0 9 9',
    fail: 'M5 5h14v14H5zM9 9l6 6M15 9l-6 6',
    ok: 'M12 4a8 8 0 1 0 .01 0zM8.5 12.5l2.5 2.5 4.5-5'
  }

  let { name, class: className = 'size-4' }: { name: GlyphName; class?: string } = $props()
</script>

<svg
  class="glyph {className}"
  class:glyph-spin={name === 'spinner'}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="square"
  stroke-linejoin="miter"
  aria-hidden="true"
>
  <path d={PATHS[name]} />
</svg>

<style>
  .glyph {
    flex-shrink: 0;
  }
  .glyph-spin {
    animation: glyph-turn 0.9s linear infinite;
  }
  @keyframes glyph-turn {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .glyph-spin {
      animation: none;
    }
  }
</style>
