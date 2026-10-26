import { describe, expect, it } from 'vitest'
import { isBundledSetting } from '../src/shared/bundled-settings'

describe('isBundledSetting', () => {
  it('hiện cài đặt của lõi cào và bộ điều phối mỏng', () => {
    for (const p of [
      'cdpPort',
      'zaloExePath',
      'targets',
      'scrollDelayMs',
      'watch.heartbeatSeconds',
      'runner.quietSeconds'
    ])
      expect(isBundledSetting(p), p).toBe(true)
  })
  it('ẩn cài đặt của phần báo cáo không có trong gói bán', () => {
    for (const p of [
      'reportSets',
      'statusExportDir',
      'groupAliases',
      'recoveryIgnoreTargets',
      'vision.enabled',
      'chat.pollSeconds',
      'total.morningHour',
      'print.enabled',
      'phases.morningEndFromHour',
      'sessions.chieuFromHour',
      'techReports.shiftEndUntil',
      'recovery.marginMinutes',
      'excelMaxColumnWidth'
    ])
      expect(isBundledSetting(p), p).toBe(false)
  })
})
