import { describe, expect, it } from 'vitest'
import { canInstallNow, describeUpdate } from '../src/main/updater'

describe('canInstallNow', () => {
  it('chỉ tổ hợp toàn false mới cài được', () => {
    for (let n = 0; n < 8; n++) {
      const g = { botsRunning: !!(n & 1), jobRunning: !!(n & 2), scrapeLockHeld: !!(n & 4) }
      expect(canInstallNow(g)).toBe(n === 0)
    }
  })
})

describe('describeUpdate', () => {
  it('bản mới là info, kèm số phiên bản', () => {
    const d = describeUpdate({ kind: 'downloaded', version: '0.1.1' })
    expect(d.severity).toBe('info')
    expect(d.text).toContain('0.1.1')
  })
  it('không có bản mới và mất mạng đều quiet', () => {
    expect(describeUpdate({ kind: 'none' }).severity).toBe('quiet')
    expect(
      describeUpdate({ kind: 'error', message: 'net::ERR_INTERNET_DISCONNECTED' }).severity
    ).toBe('quiet')
  })
})
