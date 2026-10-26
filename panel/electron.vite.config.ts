import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

const shared = resolve('src/shared')

export default defineConfig({
  main: { resolve: { alias: { '@shared': shared } } },
  preload: { resolve: { alias: { '@shared': shared } } },
  renderer: {
    resolve: { alias: { $lib: resolve('src/renderer/src/lib'), '@shared': shared } },
    plugins: [tailwindcss(), svelte()]
  }
})
