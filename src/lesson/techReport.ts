import { parseCutoff } from "../config/clockTime.js";
import { foldTitle, splitLabel } from "./parseReport.js";
import { canonicalAttendanceLabel, canonicalShiftEndLabel, canonicalShiftStartLabel, TITLE_KEYS } from "./spelling.js";
import { convert } from "../definitions/converters.js";
import { vietnamDay, vietnamHourMinute } from "./time.js";
import type { Cell, SourceMessage } from "../types/index.js";

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
export { parseClockFraction } from "../definitions/converters.js";

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

/**
 * Một tin thành một dòng của sheet (chưa có cột A, STT). Chép nguyên văn; chỉ đổi chữ toàn số thành số, "PM2" thành 2, tốc độ về Mbps,
 * camera lấy số đầu, danh sách (thực tập, máy lạnh) mỗi ý một dòng. Thiếu "Tên Trường" thì trả null.
 * Giờ của điểm danh lấy từ dòng "Thời gian", không đọc được thì dùng giờ gửi `ts`; giờ của đầu/cuối ca lấy từ tin, không đọc được thì trống.
 */
export function parseTechRow(key: TechKey, content: string, ts: number): Record<string, Cell> | null {
    const f = readLabels(content, LABEL_CANONICAL[key]);
    if (!get(f, "ten truong")) return null;
    const ctx = { ts };
    const v = (label: string) => f.get(label);
    // Bốn cột đầu giống nhau ở cả bốn sheet: CẤP, TÊN TRƯỜNG, PHÂN HIỆU, PHƯỜNG / XÃ.
    const school: Record<string, Cell> = {
        B: convert("itLevel", v("cap"), ctx),
        C: convert("text", v("ten truong"), ctx),
        D: convert("text", v("phan hieu"), ctx),
        E: convert("text", v("phuong xa"), ctx),
    };
    if (key === "attendanceStart" || key === "attendanceEnd") {
        return {
            ...school,
            F: convert("clockOrSentTime", v("thoi gian"), ctx),
            G: convert("numberOrText", v("tong so it"), ctx),
            H: convert("text", v("ten it ctv"), ctx),
            I: convert("bulletListSkipNone", v("thuc tap it"), ctx),
            J: convert("numberOrText", v("nhan vien vang"), ctx),
        };
    }
    if (key === "shiftStart") {
        return {
            ...school,
            F: convert("text", v("truong nhom it"), ctx),
            G: convert("clock", v("bat dau gio lam"), ctx),
            H: convert("roomNumbers", v("phong may truong"), ctx),
            I: convert("roomNumbers", v("phong may cong ty"), ctx),
            J: convert("roomNumbers", v("phong may lam viec"), ctx),
            K: convert("text", v("cong viec thuc hien"), ctx),
        };
    }
    return {
        ...school,
        F: convert("text", v("truong nhom it"), ctx),
        G: convert("clock", v("ket thuc gio lam"), ctx),
        H: convert("roomNumbers", v("phong may lam viec"), ctx),
        I: convert("numberOrText", v("tong so may"), ctx),
        J: convert("numberOrText", v("so may hoat dong"), ctx),
        K: convert("numberOrText", v("so may con loi"), ctx),
        L: convert("text", v("hdh windows"), ctx),
        M: convert("text", v("phan mem ms office"), ctx),
        N: convert("text", v("tinh trang netsupport"), ctx),
        O: convert("text", v("tinh trang am thanh"), ctx),
        P: convert("speedMbps", v("toc do internet"), ctx),
        Q: convert("bulletList", v("hien trang may lanh"), ctx),
        R: convert("leadingNumber", v("camera ho tro"), ctx),
        S: convert("text", v("ve sinh phong may"), ctx),
        T: convert("text", v("hoan thien bao tri"), ctx),
        U: convert("text", v("hinh anh phong may"), ctx),
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
