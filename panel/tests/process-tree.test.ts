import { spawn } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { killTree, listProcesses, selectKillTargets, type ProcInfo } from '../src/main/process-tree'

const p = (pid: number, ppid: number, name: string): ProcInfo => ({ pid, ppid, name })

describe('selectKillTargets', () => {
  // cmd (100) -> npm/tsx node (101) -> bot node (102) -> Zalo.exe (200, detached but still a child) -> its renderers (201, 202)
  const table = [
    p(100, 1, 'cmd.exe'),
    p(101, 100, 'node.exe'),
    p(102, 101, 'node.exe'),
    p(200, 102, 'Zalo.exe'),
    p(201, 200, 'Zalo.exe'),
    p(202, 201, 'Zalo.exe'),
    p(300, 1, 'node.exe'),
    p(400, 1, 'explorer.exe')
  ]

  it('takes the root and its descendants, leaves first', () => {
    expect(selectKillTargets(table, 100)).toEqual([102, 101, 100])
  })

  it('spares Zalo and everything below it', () => {
    const targets = selectKillTargets(table, 102)
    expect(targets).toEqual([102])
    expect(targets).not.toContain(200)
    expect(targets).not.toContain(201)
  })

  it('leaves unrelated processes alone', () => {
    const targets = selectKillTargets(table, 100)
    expect(targets).not.toContain(300)
    expect(targets).not.toContain(400)
  })

  it('still returns the root when it is missing from the table', () => {
    expect(selectKillTargets([], 555)).toEqual([555])
  })

  it('does not loop on a corrupt table where a process is its own ancestor', () => {
    const loop = [p(10, 11, 'a.exe'), p(11, 10, 'b.exe')]
    expect(selectKillTargets(loop, 10).sort()).toEqual([10, 11])
  })

  it('accepts a different spared pattern', () => {
    expect(selectKillTargets(table, 100, /^node\.exe$/i)).toEqual([100])
  })
})

// Real process table on Windows: start a harmless child tree, stop it, and check nothing is left.

describe.skipIf(process.platform !== 'win32')('killTree (Windows)', () => {
  it('reads the process table and stops a child tree', async () => {
    const child = spawn('cmd.exe', ['/c', 'ping', '-n', '60', '127.0.0.1'], {
      windowsHide: true,
      stdio: 'ignore'
    })
    const pid = child.pid as number
    await new Promise((r) => setTimeout(r, 800))
    const table = await listProcesses()
    expect(table.some((x) => x.pid === pid)).toBe(true)
    const killed = await killTree(pid)
    expect(killed).toContain(pid)
    await new Promise((r) => setTimeout(r, 500))
    const after = await listProcesses()
    expect(after.some((x) => killed.includes(x.pid))).toBe(false)
  }, 30_000)
})
