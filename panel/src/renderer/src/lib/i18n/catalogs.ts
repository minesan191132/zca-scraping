import type { Lang } from './index.svelte'

export const REPORT_LABELS: Record<Lang, Record<string, string>> = {
  vi: {
    netsupport: 'NetSupport',
    loa: 'Âm thanh',
    internet: 'Internet',
    mayTinh: 'Máy tính',
    dien: 'Điện',
    cleaning: 'Vệ sinh',
    attendance: 'Nội quy',
    leave: 'Nghỉ phép',
    maintenance: 'Chưa bảo trì',
    internetSpeed: 'Kết nối internet',
    minutes: 'Biên bản',
    attendanceStart: 'Điểm danh đầu buổi',
    attendanceEnd: 'Điểm danh cuối buổi',
    shiftStart: 'Công việc đầu ca',
    shiftEnd: 'Công việc cuối ca'
  },
  en: {
    netsupport: 'NetSupport',
    loa: 'Sound',
    internet: 'Internet',
    mayTinh: 'Computers',
    dien: 'Electricity',
    cleaning: 'Cleaning',
    attendance: 'House rules',
    leave: 'Leave',
    maintenance: 'Maintenance overdue',
    internetSpeed: 'Internet connection',
    minutes: 'Minutes',
    attendanceStart: 'Roll call, start of session',
    attendanceEnd: 'Roll call, end of session',
    shiftStart: 'Work, start of shift',
    shiftEnd: 'Work, end of shift'
  }
}

export const ENUM_LABELS: Record<string, Record<Lang, Record<string, string>>> = {
  'vision.leave.dateFormat': {
    vi: {
      MDY: 'Tháng / Ngày / Năm',
      DMY: 'Ngày / Tháng / Năm'
    },
    en: {
      MDY: 'Month / Day / Year',
      DMY: 'Day / Month / Year'
    }
  },
  'vision.reader': {
    vi: {
      openrouter: 'OpenRouter'
    },
    en: {
      openrouter: 'OpenRouter'
    }
  }
}

/** Defaults that config.ts describes in words, keyed by the Vietnamese original. */
export const DEFAULT_LABELS: Record<string, Record<Lang, string>> = {
  'tự dò': {
    vi: 'tự dò',
    en: 'auto-detect'
  },
  'theo máy bạn': {
    vi: 'theo máy của bạn',
    en: 'depends on this computer'
  },
  '06:00 hôm nay': {
    vi: '06:00 hôm nay',
    en: '06:00 today'
  },
  'một bộ NguyenVanA với đủ 8 loại': {
    vi: 'một bộ tên NguyenVanA có đủ 8 loại báo cáo',
    en: 'one set named NguyenVanA with all 8 report types'
  },
  '[] (mọi người)': {
    vi: '[] (mọi người)',
    en: '[] (everyone)'
  },
  'bot test': {
    vi: 'bot test',
    en: 'bot test'
  }
}
