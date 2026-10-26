import { execFile } from 'node:child_process'

/** True when a process with this pid exists (an access-denied answer still means it exists). */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

export interface ProcInfo {
  pid: number
  ppid: number
  name: string
}

/** Zalo Desktop must survive a stop: the bot starts it detached, but Windows still records the bot as its parent. */
const SPARED = /^zalo(\.exe)?$/i

/**
 * Pids to kill when stopping the process `rootPid`: the root and all its descendants, leaves first.
 * A spared process (Zalo.exe) and everything below it is left alone.
 */
export function selectKillTargets(
  table: readonly ProcInfo[],
  rootPid: number,
  spared: RegExp = SPARED
): number[] {
  const byParent = new Map<number, ProcInfo[]>()
  for (const p of table) {
    const list = byParent.get(p.ppid) ?? []
    list.push(p)
    byParent.set(p.ppid, list)
  }
  const order: number[] = []
  const seen = new Set<number>([rootPid])
  const visit = (pid: number): void => {
    for (const child of byParent.get(pid) ?? []) {
      if (seen.has(child.pid) || spared.test(child.name)) continue
      seen.add(child.pid)
      visit(child.pid)
    }
    order.push(pid)
  }
  visit(rootPid)
  return order
}

/** Snapshot of the process table through CIM; rejects when PowerShell is unavailable. */
export function listProcesses(): Promise<ProcInfo[]> {
  const script =
    'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress'
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 20_000 },
      (err, stdout) => {
        if (err) return reject(err)
        try {
          const rows = JSON.parse(stdout) as {
            ProcessId: number
            ParentProcessId: number
            Name: string
          }[]
          resolve(rows.map((r) => ({ pid: r.ProcessId, ppid: r.ParentProcessId, name: r.Name })))
        } catch (e) {
          reject(e)
        }
      }
    )
  })
}

/** Force-stops a bot process and what it started, except Zalo Desktop. Falls back to the single process when the table is unreadable. */
export async function killTree(rootPid: number): Promise<number[]> {
  let targets = [rootPid]
  try {
    targets = selectKillTargets(await listProcesses(), rootPid)
  } catch {
    // keep only the root: better to leave a child running than to kill Zalo
  }
  const args = targets.flatMap((p) => ['/PID', String(p)])
  await new Promise<void>((resolve) =>
    execFile('taskkill', [...args, '/F'], { windowsHide: true }, () => resolve())
  )
  return targets
}
