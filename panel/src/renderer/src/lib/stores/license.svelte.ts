import type { LicenseInfo } from '@shared/ipc'

let info = $state<LicenseInfo | null>(null)
let error = $state<string | null>(null)

export const license = {
  get info(): LicenseInfo | null {
    return info
  },
  /** lỗi khi chạy lệnh kiểm giấy phép (đầu ra hỏng, không có file lệnh) */
  get error(): string | null {
    return error
  },
  async refresh(): Promise<void> {
    try {
      info = await window.api.licenseGet()
      error = null
    } catch (e) {
      error = (e as Error).message
    }
  },
  /** Mở hộp chọn file rồi nhập. Trả null khi người dùng hủy, ngược lại trả trạng thái mới; lỗi thì ném. */
  async importFromDialog(): Promise<LicenseInfo | null> {
    const path = await window.api.licensePick()
    if (path === null) return null
    info = await window.api.licenseImport(path)
    error = null
    return info
  }
}
