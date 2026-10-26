// Bản ĐÓNG BĂNG của src/lesson/techReport.ts ở commit nền 38e3919 (trước khi nó dùng bộ đổi giá trị của src/definitions). Phép thử tương đương so bộ máy mới với bản này,
// không với bản hiện tại: bản hiện tại đã dùng chung bộ đổi giá trị nên so với nó là so vòng tròn. KHÔNG sửa file này.
import { parseCutoff } from "../../src/config/clockTime.js";
import { foldTitle, splitLabel } from "../../src/lesson/parseReport.js";
import { canonicalAttendanceLabel, canonicalShiftEndLabel, canonicalShiftStartLabel, isNoneValue, itLevelValue, TITLE_KEYS } from "../../src/lesson/spelling.js";
import { parseSpeedText } from "../../src/lesson/internetSpeedReport.js";
import { vietnamDay, vietnamHourMinute } from "../../src/lesson/time.js";
import type { Cell, SourceMessage } from "../../src/types/index.js";

/** Bốn báo cáo kỹ thuật dựng từ form IT mới (sheet "MỚI (2)" của 01 - MAU BAO CAO KY THUAT.xlsx). Xem docs/superpowers/specs/2026-10-22-4-bao-cao-ky-thuat-moi-design.md. */
export const TECH_KEYS = ["attendanceStart", "attendanceEnd", "shiftStart", "shiftEnd"] as const;
export type TechKey = (typeof TECH_KEYS)[number];

const TITLES: Record<string, TechKey> = {};
for (const key of TECH_KEYS) for (const t of TITLE_KEYS[key]) TITLES[t] = key;

/** Hàm đổi nhãn gõ sai về khóa gốc của từng form (xem spelling.ts). */
const LABEL_CANONICAL: Record<TechKey, (rawLabel: string) => string> = {
    attendanceStart: canonicalAttendanceLabel,
    attendanceEnd: canonicalAttendanceLabel,
    shiftStart: canonicalShiftStartLabel,
    shiftEnd: canonicalShiftEndLabel,
};

/** Loại báo cáo của tin theo dòng đầu (khớp CHÍNH XÁC, không phân biệt hoa thường và dấu); null khi không phải một trong bốn tiêu đề. */
export function classifyTechTitle(content: string): TechKey | null {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return TITLES[foldTitle(lines[0] ?? "")] ?? null;
}

export { parseCutoff };

/** Giờ trong tin ("9:00", "09h30", "9g30", "11h") thành phần ngày của Excel (0 <= x < 1); không đọc được thì null. */
export function parseClockFraction(text: string): number | null {
    const m = /^(\d{1,2})\s*[:hHgG]\s*(\d{2})?$/.exec(text.trim());
    if (!m) return null;
    const hour = Number(m[1]);
    const minute = m[2] === undefined ? 0 : Number(m[2]);
    return hour > 23 || minute > 59 ? null : (hour * 60 + minute) / 1440;
}

const text = (v: string): Cell => (v === "" ? null : v);
/** Chữ toàn số (51) hoặc số kèm đơn vị đếm ("51 máy", "3 người") thành số; chữ khác chép nguyên văn. */
const numberOrText = (v: string): Cell => (/^\d+(?:\s*(?:máy|may|pc|người|nguoi|nv|it))?$/i.test(v) ? Number(/^\d+/.exec(v)![0]) : text(v));
/** Dòng liệt kê ("a, b") thành mỗi ý một dòng "- ý"; `skip` là các giá trị nghĩa là không có gì. */
const bulletList = (v: string, skip: (item: string) => boolean = () => false): Cell => {
    const items = v.split(/[,;]/).map((s) => s.trim()).filter((s) => s !== "" && !skip(s));
    return items.length === 0 ? null : items.map((s) => `- ${s}`).join("\n");
};
/** "PM2" thành 2; "PM2, PM3, PM4" thành "2, 3, 4"; không có số nào thì chép nguyên văn. */
const roomNumbers = (v: string): Cell => {
    const nums = v.match(/\d+/g);
    if (!nums) return text(v);
    return nums.length === 1 ? Number(nums[0]) : nums.join(", ");
};
/** "1 hoạt động" thành 1; không bắt đầu bằng số thì chép nguyên văn. */
const leadingNumber = (v: string): Cell => {
    const m = /^(\d+)\b/.exec(v);
    return m ? Number(m[1]) : text(v);
};
const clockCell = (v: string): Cell => parseClockFraction(v);

/** Đọc các dòng "- Nhãn: giá trị" của tin thành bảng nhãn -> giá trị (dòng lặp nhãn thì lấy dòng cuối). Riêng "Công việc thực hiện" nhận cả các dòng tiếp theo không có dấu hai chấm. */
function readLabels(content: string, canonical: (rawLabel: string) => string): Map<string, string> {
    const out = new Map<string, string>();
    let continuing: string | null = null;
    for (const line of content.normalize("NFC").split(/\r?\n/).slice(1)) {
        const parsed = splitLabel(line);
        if (!parsed) {
            const extra = line.replace(/^\s*[-•*+]?\s*/, "").trim();
            if (continuing && extra) out.set(continuing, `${out.get(continuing) ?? ""}\n${extra}`.replace(/^\n/, ""));
            continue;
        }
        const key = canonical(parsed.label);
        out.set(key, parsed.value);
        continuing = key === "cong viec thuc hien" ? key : null;
    }
    return out;
}

type Fields = Map<string, string>;
const get = (f: Fields, key: string): string => f.get(key) ?? "";

/** Bốn cột đầu giống nhau ở cả bốn sheet: CẤP, TÊN TRƯỜNG, PHÂN HIỆU, PHƯỜNG / XÃ. */
function schoolCells(f: Fields): Record<string, Cell> {
    return { B: text(itLevelValue(get(f, "cap"))), C: text(get(f, "ten truong")), D: text(get(f, "phan hieu")), E: text(get(f, "phuong xa")) };
}

/**
 * Một tin thành một dòng của sheet (chưa có cột A, STT). Chép nguyên văn; chỉ đổi chữ toàn số thành số, "PM2" thành 2, tốc độ về Mbps,
 * camera lấy số đầu, danh sách (thực tập, máy lạnh) mỗi ý một dòng. Thiếu "Tên Trường" thì trả null.
 * Giờ của điểm danh lấy từ dòng "Thời gian", không đọc được thì dùng giờ gửi `ts`; giờ của đầu/cuối ca lấy từ tin, không đọc được thì trống.
 */
export function parseTechRow(key: TechKey, content: string, ts: number): Record<string, Cell> | null {
    const f = readLabels(content, LABEL_CANONICAL[key]);
    if (!get(f, "ten truong")) return null;
    const school = schoolCells(f);
    if (key === "attendanceStart" || key === "attendanceEnd") {
        const { hour, minute } = vietnamHourMinute(ts);
        return {
            ...school,
            // Tin cũ không có dòng "Thời gian", hoặc ghi chữ, thì lấy giờ gửi.
            F: parseClockFraction(get(f, "thoi gian")) ?? (hour * 60 + minute) / 1440,
            G: numberOrText(get(f, "tong so it")),
            H: text(get(f, "ten it ctv")),
            I: bulletList(get(f, "thuc tap it"), isNoneValue),
            J: numberOrText(get(f, "nhan vien vang")),
        };
    }
    if (key === "shiftStart") {
        return {
            ...school,
            F: text(get(f, "truong nhom it")),
            G: clockCell(get(f, "bat dau gio lam")),
            H: roomNumbers(get(f, "phong may truong")),
            I: roomNumbers(get(f, "phong may cong ty")),
            J: roomNumbers(get(f, "phong may lam viec")),
            K: text(get(f, "cong viec thuc hien")),
        };
    }
    const speed = f.has("toc do internet") ? parseSpeedText(get(f, "toc do internet")) : null;
    return {
        ...school,
        F: text(get(f, "truong nhom it")),
        G: clockCell(get(f, "ket thuc gio lam")),
        H: roomNumbers(get(f, "phong may lam viec")),
        I: numberOrText(get(f, "tong so may")),
        J: numberOrText(get(f, "so may hoat dong")),
        K: numberOrText(get(f, "so may con loi")),
        L: text(get(f, "hdh windows")),
        M: text(get(f, "phan mem ms office")),
        N: text(get(f, "tinh trang netsupport")),
        O: text(get(f, "tinh trang am thanh")),
        P: speed,
        Q: bulletList(get(f, "hien trang may lanh")),
        R: leadingNumber(get(f, "camera ho tro")),
        S: text(get(f, "ve sinh phong may")),
        T: text(get(f, "hoan thien bao tri")),
        U: text(get(f, "hinh anh phong may")),
    };
}

/**
 * Các dòng của báo cáo `key` cho ngày `day`: tin chữ đúng loại, gửi trong chính ngày đó (giờ Việt Nam) tới hết phút `cutoffMinute` (08:30 còn lấy, 08:31 không).
 * Mỗi tin một dòng, xếp theo giờ gửi rồi mã tin; cột A là STT từ 1.
 */
export function techRowsInWindow(messages: SourceMessage[], key: TechKey, day: string, cutoffMinute: number): Array<Record<string, Cell>> {
    const rows: Array<{ ts: number; id: string; row: Record<string, Cell> }> = [];
    for (const m of messages) {
        if (m.msgType !== "desktop.text" || vietnamDay(m.ts) !== day) continue;
        const { hour, minute } = vietnamHourMinute(m.ts);
        if (hour * 60 + minute > cutoffMinute || classifyTechTitle(m.content) !== key) continue;
        const row = parseTechRow(key, m.content, m.ts);
        if (row) rows.push({ ts: m.ts, id: m.msgId, row });
    }
    rows.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
    return rows.map((r, i) => ({ A: i + 1, ...r.row }));
}
