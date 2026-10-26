import { describe, expect, it } from 'vitest'
import { isProcessAlive } from '../src/main/process-tree'
import { parseStatus, reconcileWithProcess } from '../src/main/status-parse'

// The first four are the real outputs of the status commands on 2026-10-15; the rest are the forms the bots print while running.
const WATCH_STOPPED =
  '[watch] ĐÃ DỪNG lúc 13:01\n[watch] khoảng gián đoạn trong 24 giờ qua:\n  - 09:03 → 11:00 (dừng có chủ ý)\n  - 13:01 → đang diễn ra (dừng có chủ ý)'
const RUNNER_STOPPED =
  '[runner] ĐÃ DỪNG lúc 13:01\n  hàng chờ: 6 nhóm (A, B), nhóm đầu tiên vào lúc 13:00\n  vòng gần nhất lúc 12:01: OK'
const CHAT_STOPPED = '[chat] ĐÃ DỪNG lúc 13:18\n  tin chờ trong hộp thư: 34'
const TOTAL_DEAD =
  '[total] CÓ VẺ ĐÃ CHẾT: nhịp tim cuối lúc 13:50 (140 giờ 34 phút trước)\n[total] hôm nay 2026-10-15:\n  sáng 09:00: đến giờ, chưa xuất'

describe('parseStatus', () => {
  it('reads a stopped bot even when the command exits 0 (watch:status does)', () => {
    const s = parseStatus(0, WATCH_STOPPED)
    expect(s).toMatchObject({ state: 'stopped', kind: 'stopped', time: '13:01', pid: null })
  })

  it('reads the stopped runner and chat bots', () => {
    expect(parseStatus(2, RUNNER_STOPPED)).toMatchObject({ state: 'stopped', time: '13:01' })
    expect(parseStatus(2, CHAT_STOPPED)).toMatchObject({ state: 'stopped', time: '13:18' })
  })

  it('reads a dead bot with the time of its last heartbeat, not the "hôm nay" line', () => {
    expect(parseStatus(0, TOTAL_DEAD)).toMatchObject({ state: 'dead', kind: 'dead', time: '13:50' })
  })

  it('reads a bot that has never run', () => {
    expect(parseStatus(2, '[chat] chưa có dữ liệu: bot:chat chưa từng chạy.')).toMatchObject({
      state: 'dead',
      kind: 'never',
      time: null
    })
  })

  it('reads a running bot with its pid and start time', () => {
    expect(
      parseStatus(0, '[watch] ĐANG CHẠY (pid 1234) từ 15/10 08:03\n  nhịp tim cuối: 3 giây trước')
    ).toMatchObject({
      state: 'alive',
      kind: 'running',
      pid: 1234,
      since: '15/10 08:03',
      dry: false
    })
    expect(
      parseStatus(0, '[runner] ĐANG CHẠY (pid 99) từ 08:00\n  trạng thái: idle')
    ).toMatchObject({ state: 'alive', since: '08:00' })
  })

  it('flags the chat bot running in dry-run mode', () => {
    expect(
      parseStatus(0, '[chat] ĐANG CHẠY (pid 77) | DRY-RUN (không gửi thật) | nhóm: A')
    ).toMatchObject({ state: 'alive', dry: true, pid: 77 })
  })

  it('marks a running but blind watcher as a warning, with the time it went blind', () => {
    const s = parseStatus(
      0,
      '[watch] ĐANG CHẠY NHƯNG MÙ (pid 1234): nguồn phát hiện (WebSocket) không hoạt động từ 09:12'
    )
    expect(s).toMatchObject({ state: 'warn', kind: 'blind', pid: 1234, time: '09:12' })
  })

  it('marks a runner that gave up retrying as a warning', () => {
    const s = parseStatus(
      2,
      '[runner] LỖI: 3 vòng liên tiếp thất bại (pid 99). Runner đã ngừng tự thử, xem lỗi bên dưới'
    )
    expect(s).toMatchObject({ state: 'warn', kind: 'error', pid: 99 })
  })

  it('skips a warning npm prints before the status line', () => {
    expect(
      parseStatus(0, 'npm warn something odd\n[watch] ĐANG CHẠY (pid 5) từ 08:00')
    ).toMatchObject({ state: 'alive', pid: 5 })
    expect(parseStatus(0, 'npm warn something odd\n[watch] ĐÃ DỪNG lúc 13:01').state).toBe(
      'stopped'
    )
  })

  it('never claims a running bot on output it does not recognise', () => {
    expect(parseStatus(0, '')).toMatchObject({ state: 'dead', kind: 'unknown' })
    expect(parseStatus(1, 'npm error missing script: "watch:status"')).toMatchObject({
      state: 'dead',
      kind: 'unknown'
    })
    expect(parseStatus(0, 'something else entirely').state).toBe('dead')
  })
})

describe('reconcileWithProcess', () => {
  const running = parseStatus(
    0,
    '[watch] ĐANG CHẠY (pid 11564) từ 12:58 15/10\n  nhịp tim cuối: 1 phút trước'
  )

  it('keeps a running bot whose process exists', () => {
    expect(reconcileWithProcess(running, () => true)).toBe(running)
  })

  it('treats a bot whose process is gone as stopped, even though its status file still says running', () => {
    expect(reconcileWithProcess(running, () => false)).toMatchObject({
      state: 'stopped',
      kind: 'gone',
      pid: 11564
    })
  })

  it('does the same for a watcher that is running but blind, or a runner that gave up', () => {
    const blind = parseStatus(
      0,
      '[watch] ĐANG CHẠY NHƯNG MÙ (pid 7): nguồn phát hiện (WebSocket) không hoạt động từ 09:12'
    )
    expect(reconcileWithProcess(blind, () => false).kind).toBe('gone')
    const error = parseStatus(
      2,
      '[runner] LỖI: 3 vòng liên tiếp thất bại (pid 9). Runner đã ngừng tự thử'
    )
    expect(reconcileWithProcess(error, () => false).kind).toBe('gone')
  })

  it('leaves stopped, dead and unknown results alone, and never asks about a pid they do not have', () => {
    const calls: number[] = []
    for (const text of [
      '[watch] ĐÃ DỪNG lúc 13:01',
      '[total] CÓ VẺ ĐÃ CHẾT: nhịp tim cuối lúc 13:50',
      '',
      '[chat] chưa từng chạy'
    ]) {
      const parsed = parseStatus(0, text)
      expect(reconcileWithProcess(parsed, (pid) => (calls.push(pid), false))).toBe(parsed)
    }
    expect(calls).toEqual([])
  })

  it('finds a real process by pid', () => {
    expect(isProcessAlive(process.pid)).toBe(true)
    expect(isProcessAlive(2_000_000_000)).toBe(false)
  })
})
