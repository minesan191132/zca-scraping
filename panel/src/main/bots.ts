import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import type { Readable } from 'node:stream'
import { BOTS, jobSteps, type BotId, type JobRequest } from '@shared/bots'
import type { ActionResult, LogLine } from '@shared/ipc'
import type { BotStatus } from '@shared/status'
import {
  BUNDLED_BOT_IDS,
  runCommand,
  SOURCE_MODE,
  scriptCommand,
  stepCommand,
  type Mode
} from './command'
import { isProcessAlive, killTree } from './process-tree'
import { parseStatus, reconcileWithProcess } from './status-parse'

export interface Emitter {
  log(line: LogLine): void
  botExit(e: { id: BotId; code: number | null }): void
  jobState(e: { running: boolean; ok?: boolean }): void
}

/** Runs a script's command and returns its output and exit code; never rejects. A script the bundle does not have gives a message instead. */
async function runScript(
  cwd: string,
  script: string,
  mode: Mode,
  timeout: number
): Promise<{ code: number; text: string }> {
  const cmd = scriptCommand(script, mode)
  if (!cmd) return { code: 1, text: NOT_IN_BUNDLE }
  const r = await runCommand(cmd, cwd, timeout)
  return { code: r.code, text: `${r.stdout}${r.stderr}`.trim() }
}

/** Shown as the status text of a bot that this build does not include. */
const NOT_IN_BUNDLE = 'không có trong bản này'

function pipeLines(stream: Readable, onLine: (line: string) => void): void {
  let buf = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    buf += chunk
    const lines = buf.split(/\r?\n/)
    buf = lines.pop() ?? ''
    for (const line of lines) if (line) onLine(line)
  })
  stream.on('end', () => {
    if (buf) onLine(buf)
  })
}

/** Starts, stops and reads the state of the bots and the one-off jobs. Only commands listed in @shared/bots are ever run. */
export class BotManager {
  private readonly running = new Map<BotId, ChildProcess>()
  private readonly startedAt = new Map<BotId, number>()
  /** the one job that may run at a time (it drives Zalo Desktop); the step process while one is running */
  private job: { child: ChildProcess | null } | null = null

  constructor(
    private readonly projectDir: () => string | null,
    private readonly emit: Emitter,
    private readonly mode: () => Mode = () => SOURCE_MODE
  ) {}

  async status(): Promise<BotStatus[]> {
    const cwd = this.projectDir()
    // Bản cài chỉ có hai bot; chat và báo cáo tổng không có lệnh gộp nên không hỏi trạng thái của chúng.
    const bots = this.mode().bundled
      ? BOTS.filter((b) => (BUNDLED_BOT_IDS as readonly string[]).includes(b.id))
      : BOTS
    return Promise.all(
      bots.map(async (bot) => {
        const r = cwd
          ? await runScript(cwd, bot.status, this.mode(), 30_000)
          : { code: 1, text: '' }
        return {
          id: bot.id,
          ...reconcileWithProcess(parseStatus(r.code, r.text), isProcessAlive),
          text: r.text,
          startedByApp: this.running.has(bot.id),
          startedAtMs: this.startedAt.get(bot.id) ?? null
        }
      })
    )
  }

  start(id: BotId): ActionResult {
    const cwd = this.projectDir()
    const bot = BOTS.find((b) => b.id === id)
    if (!cwd) return { ok: false, error: 'no-project' }
    if (!bot) return { ok: false, error: 'unknown-bot' }
    if (this.running.has(id)) return { ok: false, error: 'already-started' }
    const cmd = scriptCommand(bot.start, this.mode())
    if (!cmd) return { ok: false, error: 'not-in-bundle' }
    const child = spawn(cmd.command, cmd.args, {
      cwd,
      windowsHide: true,
      env: { ...process.env, ...cmd.env }
    })
    this.running.set(id, child)
    this.startedAt.set(id, Date.now())
    this.emit.log({ channel: id, line: `── ${bot.start} (pid ${child.pid}) ──` })
    pipeLines(child.stdout, (line) => this.emit.log({ channel: id, line }))
    pipeLines(child.stderr, (line) => this.emit.log({ channel: id, line }))
    child.on('exit', (code) => {
      this.running.delete(id)
      this.startedAt.delete(id)
      this.emit.log({ channel: id, line: `── ${bot.start} exit ${code} ──` })
      this.emit.botExit({ id, code })
    })
    return { ok: true }
  }

  /** Stops the bot this app started, or else the process whose pid the status command reported. */
  async stop(id: BotId, pid: number | null): Promise<ActionResult> {
    const bot = BOTS.find((b) => b.id === id)
    if (!bot) return { ok: false, error: 'unknown-bot' }
    const target = this.running.get(id)?.pid ?? pid
    if (!target) return { ok: false, error: 'no-pid' }
    const killed = await killTree(target)
    this.emit.log({ channel: id, line: `── stopped ${bot.start}: ${killed.join(', ')} ──` })
    return { ok: true }
  }

  /** Runs the steps of a job one after the other and stops at the first one that fails. Only one job runs at a time. */
  async runJob(request: JobRequest): Promise<ActionResult> {
    const cwd = this.projectDir()
    if (!cwd) return { ok: false, error: 'no-project' }
    if (this.job) return { ok: false, error: 'already-running' }
    const job = { child: null as ChildProcess | null }
    this.job = job
    this.emit.jobState({ running: true })
    this.emit.log({
      channel: 'jobs',
      line: `══ ${request.mode} · ${request.sets.join(', ') || '*'} · ${request.slot} ══`
    })
    let failed = false
    for (const step of jobSteps(request)) {
      if (failed) break
      this.emit.log({ channel: 'jobs', line: `$ npm ${step.join(' ')}` })
      const cmd = stepCommand(step, this.mode())
      if (!cmd) {
        failed = true
        this.emit.log({ channel: 'jobs', line: `✗ ${NOT_IN_BUNDLE}` })
        break
      }
      const code = await new Promise<number | null>((resolve) => {
        const child = spawn(cmd.command, cmd.args, {
          cwd,
          windowsHide: true,
          env: { ...process.env, ...cmd.env }
        })
        job.child = child
        pipeLines(child.stdout, (line) => this.emit.log({ channel: 'jobs', line }))
        pipeLines(child.stderr, (line) => this.emit.log({ channel: 'jobs', line }))
        child.on('exit', resolve)
      })
      if (code !== 0) {
        failed = true
        this.emit.log({ channel: 'jobs', line: `✗ exit ${code}` })
      }
    }
    if (!failed) this.emit.log({ channel: 'jobs', line: '✓' })
    this.job = null
    this.emit.jobState({ running: false, ok: !failed })
    return { ok: !failed }
  }

  private ownedPids(): number[] {
    return [...this.running.values(), this.job?.child]
      .map((c) => c?.pid)
      .filter((p): p is number => typeof p === 'number')
  }

  /** True while a job (một chuỗi lệnh dựng báo cáo) đang chạy. */
  jobRunning(): boolean {
    return this.job !== null
  }

  /** True while a bot or job started by this app is still running. */
  hasOwned(): boolean {
    return this.ownedPids().length > 0
  }

  /**
   * On quit: stop what this app started (bots started elsewhere are left alone). Listing the process tree takes a moment, and the
   * app must not exit before taskkill has run, so the caller waits for this. After `timeoutMs` the roots are killed without the
   * tree walk (children may outlive them, Zalo is never touched).
   */
  async killOwned(timeoutMs = 6000): Promise<void> {
    const pids = this.ownedPids()
    const walked = Promise.all(pids.map((p) => killTree(p))).then(() => true)
    const timedOut = new Promise<false>((resolve) => setTimeout(() => resolve(false), timeoutMs))
    if (await Promise.race([walked, timedOut])) return
    for (const pid of pids) {
      try {
        execFileSync('taskkill', ['/PID', String(pid), '/F'], {
          windowsHide: true,
          stdio: 'ignore'
        })
      } catch {
        // already gone
      }
    }
  }
}
