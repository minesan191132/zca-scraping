import { DEFAULT_LABELS, ENUM_LABELS, REPORT_LABELS } from './catalogs'
import { en } from './en'
import { SETTING_TEXTS } from './settingTexts'
import { vi, type MessageKey } from './vi'

export type Lang = 'vi' | 'en'
export type { MessageKey }

const STORAGE_KEY = 'zbots.lang'
const dictionaries: Record<Lang, Record<MessageKey, string>> = { vi, en }

function readSaved(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'vi'
  } catch {
    return 'vi'
  }
}

let lang = $state<Lang>(readSaved())

/** Translates a key. Reading `lang` here makes every template and $derived that calls it follow the language. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let text = dictionaries[lang][key]
  if (params)
    for (const [name, value] of Object.entries(params))
      text = text.split(`{${name}}`).join(String(value))
  return text
}

export const i18n = {
  get lang(): Lang {
    return lang
  },
  setLang(next: Lang): void {
    lang = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // not remembered, the choice still applies for this session
    }
    document.documentElement.lang = next
  },
  init(): void {
    document.documentElement.lang = lang
  },
  /** Setting name; falls back to the original Vietnamese from the project when texts.ts lacks the key. */
  settingLabel: (path: string): string => SETTING_TEXTS[path]?.[lang].label ?? path,
  settingNote: (path: string, fallback: string): string =>
    SETTING_TEXTS[path]?.[lang].note ?? fallback,
  reportLabel: (code: string): string => REPORT_LABELS[lang][code] ?? code,
  enumLabel: (path: string, value: string): string => ENUM_LABELS[path]?.[lang]?.[value] ?? value,
  defaultLabel: (raw: string): string => DEFAULT_LABELS[raw]?.[lang] ?? raw,
  /** Displayed unit; the raw Vietnamese unit from the project is the key. */
  unit: (raw: string): string => (raw ? (UNIT_LABELS[raw]?.[lang] ?? raw) : raw)
}

const UNIT_LABELS: Record<string, Record<Lang, string>> = {
  giây: { vi: 'giây', en: 'seconds' },
  phút: { vi: 'phút', en: 'minutes' },
  giờ: { vi: 'giờ', en: 'hours' },
  ngày: { vi: 'ngày', en: 'days' },
  vòng: { vi: 'vòng', en: 'rounds' },
  lần: { vi: 'lần', en: 'times' },
  tin: { vi: 'tin', en: 'messages' },
  ms: { vi: 'ms', en: 'ms' },
  trang: { vi: 'trang', en: 'pages' },
  'ký tự': { vi: 'ký tự', en: 'characters' },
  ảnh: { vi: 'ảnh', en: 'images' },
  bộ: { vi: 'bộ ảnh', en: 'image batches' },
  luồng: { vi: 'luồng', en: 'threads' },
  'mốc giờ': { vi: 'giờ trong ngày', en: 'time of day' },
  'true/false': { vi: 'bật/tắt', en: 'on/off' }
}
