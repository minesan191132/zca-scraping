// Builds the deployment kit: one zip with the bot code, the packaged panel, the Excel templates and an install script.
//   node scripts/make-kit.mjs --out D:\Kit
// Needs `npm run build:unpack` (or build:win) first, and git. The zip is written to --out, never inside the project.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const panelDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = resolve(panelDir, '..')

const outArg = process.argv.indexOf('--out')
if (outArg < 0 || !process.argv[outArg + 1]) {
  console.error('Usage: node scripts/make-kit.mjs --out <folder outside the project>')
  process.exit(1)
}
const outDir = resolve(process.argv[outArg + 1])
if (outDir === repoDir || outDir.startsWith(repoDir + '\\') || outDir.startsWith(repoDir + '/')) {
  console.error(`--out must be outside the project (${repoDir}).`)
  process.exit(1)
}

const unpacked = join(panelDir, 'dist', 'win-unpacked')
if (!existsSync(join(unpacked, 'zalo-bots.exe'))) {
  console.error('Missing dist\\win-unpacked\\zalo-bots.exe: run `npm run build:unpack` first.')
  process.exit(1)
}
const templates = join(repoDir, 'data', 'mau bao cao new')
if (!existsSync(templates)) {
  console.error(`Missing the Excel templates folder: ${templates}`)
  process.exit(1)
}

// What the bot needs to run. Tests, docs of the agents, the panel source, the demo and the user's data stay out.
const BOT_PATHS = [
  'src',
  'scripts',
  'photo-rules',
  'photo-golden',
  'config.ts',
  'chat-rules.json',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'README.md',
  '.env.example',
  'docs/GUIDE.md',
  'docs/QUY-TRINH.md'
]

const git = (...args) => execFileSync('git', ['-C', repoDir, ...args], { encoding: 'utf8' }).trim()
const commit = git('rev-parse', '--short', 'HEAD')
const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
const dirty = git(
  'status',
  '--porcelain',
  '--untracked-files=no',
  '--',
  ...BOT_PATHS.filter((p) => existsSync(join(repoDir, p)))
)
const today = new Date().toISOString().slice(0, 10)
const name = `zca-kit-${today}`

const work = mkdtempSync(join(tmpdir(), 'zca-kit-'))
const stage = join(work, name)
try {
  mkdirSync(join(stage, 'zca-scrape-message'), { recursive: true })

  // 1. bot code as committed (git archive never includes untracked or ignored files such as .env or data/)
  const tarFile = join(work, 'bot.tar')
  execFileSync('git', [
    '-C',
    repoDir,
    'archive',
    '--format=tar',
    '-o',
    tarFile,
    'HEAD',
    ...BOT_PATHS
  ])
  execFileSync(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), [
    '-xf',
    tarFile,
    '-C',
    join(stage, 'zca-scrape-message')
  ])

  // 2. Excel templates: the whole data folder is ignored by git, so they are copied from the working folder (no Office lock files)
  const dstTemplates = join(stage, 'zca-scrape-message', 'data', 'mau bao cao new')
  mkdirSync(dstTemplates, { recursive: true })
  let templateCount = 0
  for (const f of readdirSync(templates)) {
    if (f.startsWith('~$') || !statSync(join(templates, f)).isFile()) continue
    cpSync(join(templates, f), join(dstTemplates, f))
    templateCount++
  }

  // 3. the packaged panel, next to the project so it finds it; no path of this machine is left in it
  cpSync(unpacked, join(stage, 'Zalo Bots'), { recursive: true })
  writeFileSync(
    join(stage, 'Zalo Bots', 'resources', 'default-project.json'),
    JSON.stringify({ dir: null }) + '\n'
  )

  // 4. install script and instructions (UTF-8 with BOM so Windows PowerShell and Notepad read the Vietnamese right)
  for (const f of readdirSync(join(panelDir, 'kit'))) {
    const text = readFileSync(join(panelDir, 'kit', f), 'utf8').replace(/^\uFEFF/, '')
    const bom = /\.(ps1|txt)$/.test(f) ? '\uFEFF' : ''
    writeFileSync(join(stage, f), bom + text.replace(/\r?\n/g, '\r\n'))
  }
  writeFileSync(
    join(stage, 'VERSION.txt'),
    `Gói triển khai Zalo Bots\r\nNgày dựng: ${today}\r\nMã nguồn bot: ${commit} (nhánh ${branch})\r\n` +
      (dirty
        ? `Cảnh báo: lúc dựng, file của bot có thay đổi chưa commit, gói dùng bản đã commit:\r\n${dirty.replace(/\n/g, '\r\n')}\r\n`
        : '')
  )

  // 5. zip (Windows tar writes zip with -a)
  mkdirSync(outDir, { recursive: true })
  const zip = join(outDir, `${name}.zip`)
  rmSync(zip, { force: true })
  execFileSync(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), [
    '-a',
    '-c',
    '-f',
    zip,
    '-C',
    work,
    name
  ])

  const sha = createHash('sha256').update(readFileSync(zip)).digest('hex')
  console.log(`kit:       ${zip}`)
  console.log(`size:      ${(statSync(zip).size / 1024 / 1024).toFixed(1)} MB`)
  console.log(`sha256:    ${sha}`)
  console.log(
    `bot code:  ${commit} on ${branch}${dirty ? ' (working copy has uncommitted changes, they are NOT in the kit)' : ''}`
  )
  console.log(`templates: ${templateCount} files`)
  console.log(
    `inside:    ${basename(stage)}/ { zca-scrape-message, Zalo Bots, Cai-dat.cmd, Cai-dat.ps1, HUONG-DAN.txt, VERSION.txt }`
  )
} finally {
  rmSync(work, { recursive: true, force: true })
}
