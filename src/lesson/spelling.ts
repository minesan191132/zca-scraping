import {
    ELECTRIC_LABELS, GRADE_VALUES, IT_ATTENDANCE_LABELS, IT_LEVEL_VALUES, IT_SHIFT_END_LABELS, IT_SHIFT_START_LABELS, LEVEL_ALIASES, NONE_VALUES,
    SCHOOL_FORM_IGNORED_LABELS, SCHOOL_FORM_LABELS, SCHOOL_HEADER_LABELS, TITLE_ALIASES, type SpellingEntry,
} from "../constants/spellingAliases.js";
import { fold } from "./foldText.js";

// Bảng lỗi chính tả (src/constants/spellingAliases.ts) thành các hàm tra cho parser. File này KHÔNG import parseReport.ts: parseReport.ts import file này, và các bảng tra
// dựng ngay lúc nạp module nên một vòng import sẽ dùng `fold` trước khi nó được định nghĩa.
// Chỉ khớp chính xác sau khi bỏ dấu, hoa thường và dấu câu; không so gần đúng.

/** Khóa so nhãn và giá trị: ký tự không phải chữ số hay chữ cái thành một khoảng trắng ("Phường / Xã" và "Phường/Xã" cùng ra "phuong xa"). Cùng cách `labelKey` của techReport.ts. */
export const labelKey = (s: string): string => fold(s).replace(/[^a-z0-9]+/g, " ").trim();

/** Khóa so tiêu đề: bỏ dấu, hoa thường, cắt dấu câu hai đầu (người gửi chép kèm dấu ngoặc kép, dấu sao). Cùng cách `foldTitle` của parseReport.ts. */
export const titleKey = (s: string): string => fold(s).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");

type Scope = Record<string, SpellingEntry>;

const forms = (s: Scope): string[] => Object.keys(s);

/** Bộ đổi nhãn gõ sai về `labelKey` của dạng đúng; nhãn không có trong bảng giữ `labelKey` của chính nó. */
function canonicalizer(scope: Scope): (rawLabel: string) => string {
    const map = new Map<string, string>();
    for (const e of Object.values(scope)) {
        const canonical = labelKey(e.canonical);
        map.set(canonical, canonical);
        for (const v of e.variants) map.set(labelKey(v), canonical);
    }
    return (raw) => {
        const k = labelKey(raw);
        return map.get(k) ?? k;
    };
}

/** Nhãn của từng form IT về khóa gốc (vd "Tên Truog" ra "ten truong"). Mỗi form có phạm vi riêng vì một nhãn gõ sai có thể là dòng khác ở form khác. */
export const canonicalAttendanceLabel = canonicalizer({ ...SCHOOL_HEADER_LABELS, ...IT_ATTENDANCE_LABELS });
export const canonicalShiftStartLabel = canonicalizer({ ...SCHOOL_HEADER_LABELS, ...IT_SHIFT_START_LABELS });
export const canonicalShiftEndLabel = canonicalizer({ ...SCHOOL_HEADER_LABELS, ...IT_SHIFT_END_LABELS });
export const canonicalElectricLabel = canonicalizer(ELECTRIC_LABELS);

/** Form trường: nhãn gõ sai thành tên trường dữ liệu, hoặc "ignore" khi là dòng bot cố ý không đọc (Cấp, Tên Trợ giảng, Tình trạng Internet, Tốc độ internet). */
const SCHOOL_SCOPE: Scope = { ...SCHOOL_HEADER_LABELS, ...SCHOOL_FORM_LABELS, ...SCHOOL_FORM_IGNORED_LABELS };
const SCHOOL_IGNORED = new Set<string>(["cap", ...forms(SCHOOL_FORM_IGNORED_LABELS)]);
const SCHOOL_LABELS = new Map<string, string>();
for (const [field, e] of Object.entries(SCHOOL_SCOPE)) {
    SCHOOL_LABELS.set(labelKey(e.canonical), field);
    for (const v of e.variants) SCHOOL_LABELS.set(labelKey(v), field);
}

export function resolveSchoolLabel(rawLabel: string): { field: string } | "ignore" | null {
    const field = SCHOOL_LABELS.get(labelKey(rawLabel));
    if (field === undefined) return null;
    return SCHOOL_IGNORED.has(field) ? "ignore" : { field };
}

const keysOf = (e: SpellingEntry): Set<string> => new Set([e.canonical, ...e.variants].map(titleKey));

/** Tiêu đề (cả dạng đúng lẫn gõ sai) của từng loại tin, đã qua `titleKey`. */
export const TITLE_KEYS = {
    schoolStart: keysOf(TITLE_ALIASES.schoolStart),
    schoolEnd: keysOf(TITLE_ALIASES.schoolEnd),
    attendanceStart: keysOf(TITLE_ALIASES.attendanceStart),
    attendanceEnd: keysOf(TITLE_ALIASES.attendanceEnd),
    shiftStart: keysOf(TITLE_ALIASES.shiftStart),
    shiftEnd: keysOf(TITLE_ALIASES.shiftEnd),
    /** Tiêu đề LỖI ĐIỆN so bằng `fold` (không cắt dấu câu hai đầu), như trước. */
    electric: new Set([TITLE_ALIASES.electric.canonical, ...TITLE_ALIASES.electric.variants].map(fold)),
} as const;

const GRADES = new Map<string, "T" | "B" | "K">();
for (const [grade, e] of Object.entries(GRADE_VALUES) as Array<["T" | "B" | "K", SpellingEntry]>) {
    for (const v of [e.canonical, ...e.variants]) GRADES.set(labelKey(v), grade);
}

/** Xếp loại T/B/K của một giá trị viết thành chữ ("Tốt" ra "T"); null khi không có trong bảng. Chỉ khớp cả giá trị. */
export const gradeFromText = (value: string): "T" | "B" | "K" | null => GRADES.get(labelKey(value)) ?? null;

const NONE = new Set([NONE_VALUES.canonical, ...NONE_VALUES.variants].map(labelKey));

/** Giá trị nghĩa là "không có gì" ("0", "Không", "Ko", "N/A"...). */
export const isNoneValue = (value: string): boolean => NONE.has(labelKey(value));

const IT_LEVELS = new Map<string, string>();
for (const e of Object.values(IT_LEVEL_VALUES)) {
    for (const v of [e.canonical, ...e.variants]) IT_LEVELS.set(labelKey(v), e.canonical);
}

/** Giá trị dòng "Cấp" của form IT về dạng La Mã đúng ("l" ra "I", "2" ra "II"); không có trong bảng thì giữ nguyên. */
export const itLevelValue = (value: string): string => IT_LEVELS.get(labelKey(value)) ?? value;

// --- Tên trường của form trường ---

const LEVEL_CODES = new Map<string, string>();
const levelTokens: string[] = [];
for (const e of Object.values(LEVEL_ALIASES)) {
    for (const v of [e.canonical, ...e.variants]) {
        LEVEL_CODES.set(labelKey(v), e.canonical);
        levelTokens.push(v);
    }
}
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Dài trước để "THPT" thắng "TH", "Tiểu học" thắng "TH"; sau mã không được dính chữ hay số ("THỦ ĐỨC" không phải "TH").
const LEVEL_RE = new RegExp(`^(${levelTokens.sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})(?![\\p{L}\\d])`, "iu");

/**
 * Tách chuỗi cấp học đứng đầu tên trường ("TiH-THCS-THPT Bình Minh" ra ["TH", "THCS", "THPT"] và "Bình Minh"). Mọi phần của chuỗi cấp phải nằm trong bảng và phần còn lại phải
 * bắt đầu bằng khoảng trắng; không thì coi như không có chuỗi cấp (codes rỗng, name là cả chuỗi).
 */
export function splitLevelChain(text: string): { codes: string[]; name: string } {
    const none = { codes: [] as string[], name: text };
    const codes: string[] = [];
    let rest = text;
    for (;;) {
        const m = LEVEL_RE.exec(rest);
        if (!m) break;
        codes.push(LEVEL_CODES.get(labelKey(m[1])) ?? m[1].toUpperCase());
        rest = rest.slice(m[0].length);
        const sep = /^\s*-\s*/.exec(rest);
        if (sep && LEVEL_RE.test(rest.slice(sep[0].length))) rest = rest.slice(sep[0].length);
        else break;
    }
    if (codes.length === 0 || !/^\s+\S/.test(rest)) return none;
    return { codes, name: rest.trim() };
}

const STRAY_EDGE = /^[\s"'`“”‘’*]+|[\s"'`“”‘’*]+$/g;

/**
 * Làm sạch dòng "Tên Trường" của form trường để hiện ở file Excel: NFC, bỏ dấu ngoặc kép, dấu sao thừa ở hai đầu, gộp khoảng trắng, đưa chuỗi cấp học về mã đúng
 * ngăn bằng " - " ("TiH-THCS-THPT Bình Minh" ra "TH - THCS - THPT Bình Minh"). Phần tên trường giữ NGUYÊN chữ người gửi; chuỗi cấp lạ thì cả chuỗi giữ nguyên.
 */
export function cleanSchoolName(raw: string): string {
    const s = raw.normalize("NFC").replace(STRAY_EDGE, "").replace(/\s+/g, " ");
    const { codes, name } = splitLevelChain(s);
    return codes.length === 0 ? s : `${codes.join(" - ")} ${name}`;
}

const alnum = (s: string): string => fold(s).replace(/[^a-z0-9]/g, "");

/** Phần tên (bỏ chuỗi cấp) của `schoolName` có cùng chữ cái và chữ số với tên trường đọc từ tên nhóm không (`tenRieng`, vd "SAO MAI 1")? So không kể dấu, hoa thường, khoảng trắng, dấu câu. */
export function schoolNameMatchesGroup(schoolName: string, tenRieng: string): boolean {
    return alnum(splitLevelChain(schoolName).name) === alnum(tenRieng);
}
