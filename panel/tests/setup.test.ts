import { describe, expect, it } from 'vitest'
import { parseExcelProbe, pickZaloExe } from '../src/main/setup'
import {
  nextSetupStep,
  normalizeTargets,
  setupConfigPatch,
  setupProblems,
  validateExportDir,
  type SetupInput
} from '../src/shared/setup'

describe('pickZaloExe', () => {
  const list = (): string[] => ['Zalo-9.0.1', 'Zalo-10.1.0', 'readme']
  it('chọn phiên bản số lớn nhất, không theo chữ', () => {
    expect(pickZaloExe('P', list, () => true)).toMatch(/Zalo-10\.1\.0[\\/]Zalo\.exe$/)
  })
  it('rơi về bản cũ hơn khi bản mới thiếu Zalo.exe', () => {
    expect(pickZaloExe('P', list, (f) => !f.includes('10.1.0'))).toMatch(
      /Zalo-9\.0\.1[\\/]Zalo\.exe$/
    )
  })
  it('danh sách rỗng cho null', () => {
    expect(
      pickZaloExe(
        'P',
        () => [],
        () => true
      )
    ).toBeNull()
  })
})

describe('parseExcelProbe', () => {
  it('có GUID thì true', () => {
    const out =
      '\r\nHKEY_CLASSES_ROOT\\Excel.Application\\CLSID\r\n    (Default)    REG_SZ    {00024500-0000-0000-C000-000000000046}\r\n'
    expect(parseExcelProbe(out)).toBe(true)
  })
  it('lỗi hoặc rỗng thì false', () => {
    expect(
      parseExcelProbe('ERROR: The system was unable to find the specified registry key or value.')
    ).toBe(false)
    expect(parseExcelProbe('')).toBe(false)
  })
})

describe('normalizeTargets', () => {
  it('cắt, bỏ rỗng, bỏ ký tự điều khiển, bỏ trùng', () => {
    const r = normalizeTargets([' A ', 'a', '', 'B\u0007'])
    expect(r.targets).toEqual(['A', 'B'])
    expect(r.errors).toHaveLength(2)
    expect(r.errors.some((e) => e.startsWith('bỏ trùng'))).toBe(true)
    expect(r.errors.some((e) => e.startsWith('bỏ ký tự điều khiển'))).toBe(true)
  })
  it('rỗng thì báo chưa có nhóm nào', () => {
    expect(normalizeTargets(['  ', ''])).toEqual({ targets: [], errors: ['chưa có nhóm nào'] })
  })
  it('giữ nguyên dấu và hoa thường', () => {
    expect(normalizeTargets(['LC_BìnhMinh_BTAN']).targets).toEqual(['LC_BìnhMinh_BTAN'])
  })
})

describe('validateExportDir', () => {
  it('lỗi với rỗng, tương đối, Program Files, thư mục cài', () => {
    expect(validateExportDir('')).not.toBeNull()
    expect(validateExportDir('relative\\x')).not.toBeNull()
    expect(validateExportDir('C:\\Program Files\\App\\out')).not.toBeNull()
    expect(validateExportDir('D:\\App\\out', 'D:\\App')).not.toBeNull()
  })
  it('hợp lệ thì null', () => {
    expect(validateExportDir('D:\\BaoCao')).toBeNull()
    expect(validateExportDir('D:\\AppData', 'D:\\App')).toBeNull()
  })
})

describe('nextSetupStep / setupProblems', () => {
  const full: SetupInput = {
    licenseOk: true,
    env: { zaloExe: 'C:\\Zalo.exe', excelInstalled: true },
    targets: ['A'],
    statusExportDir: 'D:\\BaoCao'
  }
  it('đủ cả thì done', () => {
    expect(nextSetupStep(full)).toBe('done')
    expect(setupProblems(full)).toEqual([])
  })
  it('thiếu giấy phép luôn là license', () => {
    expect(nextSetupStep({ ...full, licenseOk: false, targets: [] })).toBe('license')
  })
  it('thiếu Zalo thì environment', () => {
    expect(nextSetupStep({ ...full, env: { zaloExe: null, excelInstalled: true } })).toBe(
      'environment'
    )
  })
  it('thiếu Excel mà có Zalo thì đi tiếp, chỉ cảnh báo', () => {
    const input = { ...full, env: { zaloExe: 'C:\\Zalo.exe', excelInstalled: false }, targets: [] }
    expect(nextSetupStep(input)).toBe('groups')
    expect(setupProblems(input).some((p) => p.includes('Excel'))).toBe(true)
  })
  it('targets rỗng thì groups, thư mục xuất null hoặc sai thì output', () => {
    expect(nextSetupStep({ ...full, targets: [] })).toBe('groups')
    expect(nextSetupStep({ ...full, statusExportDir: null })).toBe('output')
    expect(nextSetupStep({ ...full, statusExportDir: 'x' })).toBe('output')
  })
})

describe('setupConfigPatch', () => {
  it('ghi zaloExePath khi tìm được, rỗng khi không', () => {
    expect(setupConfigPatch({ zaloExe: 'C:\\Z\\Zalo.exe', excelInstalled: true })).toEqual({
      zaloExePath: 'C:\\Z\\Zalo.exe'
    })
    expect(setupConfigPatch({ zaloExe: null, excelInstalled: true })).toEqual({})
  })
})
