// Runs before packaging. Records the bot project this panel sits in, so an installed copy built from inside the project
// opens without asking for a folder. The app validates the path at run time and ignores it when it no longer fits.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const panelDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectDir = resolve(panelDir, '..')

let dir = null
try {
  const scripts = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8')).scripts ?? {}
  if (typeof scripts['bot:watch'] === 'string' && typeof scripts['watch:status'] === 'string')
    dir = projectDir
} catch {
  // the panel is not inside a bot project: leave the default empty
}

mkdirSync(join(panelDir, 'build'), { recursive: true })
writeFileSync(
  join(panelDir, 'build', 'default-project.json'),
  JSON.stringify({ dir }, null, 2) + '\n'
)
console.log(`default project folder: ${dir ?? '(none)'}`)
