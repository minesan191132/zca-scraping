import { parseCutoff } from "../config/clockTime.js";
import { splitLabel } from "../lesson/parseReport.js";
import { canonicalAttendanceLabel, canonicalShiftEndLabel, canonicalShiftStartLabel, labelKey, TITLE_KEYS, titleKey } from "../lesson/spelling.js";
import { vietnamDay, vietnamHourMinute } from "../lesson/time.js";
import type { Cell, SourceMessage } from "../types/index.js";
import { convert } from "./converters.js";
import type { LabelScope, ReportDefinition } from "./types.js";

/** `"match"`: đúng tiêu đề và đủ nhãn bắt buộc; `"near"`: đúng tiêu đề nhưng thiếu hoặc rỗng một nhãn bắt buộc; null: không phải báo cáo này. */
export type MatchKind = "match" | "near" | null;

const LABEL_CANONICAL: Record<LabelScope, (rawLabel: string) => string> = {
    attendance: canonicalAttendanceLabel,
    shiftStart: canonicalShiftStartLabel,
    shiftEnd: canonicalShiftEndLabel,
};

/** Khóa nhãn của tin: theo bộ chuẩn hóa của `labelScope` (đổi nhãn gõ sai về nhãn gốc), không có thì `labelKey`. */
const canonicalOf = (def: ReportDefinition): ((rawLabel: string) => string) => (def.labelScope ? LABEL_CANONICAL[def.labelScope] : labelKey);

/** Các khóa tiêu đề mà định nghĩa nhận: bảng chính tả của `titleScope` cộng `titles` tự liệt kê. */
function titleKeysOf(def: ReportDefinition): Set<string> {
    const keys = new Set<string>(def.titles.map(titleKey));
    if (def.titleScope) for (const k of TITLE_KEYS[def.titleScope]) keys.add(k);
    return keys;
}

/** Đọc các dòng "- Nhãn: giá trị" của tin thành bảng khóa nhãn -> giá trị (dòng lặp nhãn thì lấy dòng cuối). Nhãn `continuationLabel` nhận cả các dòng tiếp theo không có dấu hai chấm. */
function readLabels(def: ReportDefinition, content: string): Map<string, string> {
    const canonical = canonicalOf(def);
    const continuation = def.continuationLabel === undefined ? null : labelKey(def.continuationLabel);
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
        continuing = key === continuation ? key : null;
    }
    return out;
}

const titleMatches = (def: ReportDefinition, content: string): boolean => {
    const first = content.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
    return titleKeysOf(def).has(titleKey(first));
};

/** Nhãn bắt buộc (dạng `labelKey`) mà tin thiếu hoặc để trống. Không xét tiêu đề. */
export function missingLabels(def: ReportDefinition, content: string): string[] {
    const f = readLabels(def, content);
    return def.requiredLabels.map(labelKey).filter((k) => !f.get(k));
}

/** Nhãn có trong tin mà không cột nào và không `requiredLabels` dùng (dạng khóa nhãn của tin). */
export function unknownLabels(def: ReportDefinition, content: string): string[] {
    const used = new Set<string>([...def.requiredLabels, ...def.columns.flatMap((c) => c.labels)].map(labelKey));
    return [...readLabels(def, content).keys()].filter((k) => !used.has(k));
}

/** Tin có thuộc báo cáo này không: xem `MatchKind`. */
export function classifyByDefinition(def: ReportDefinition, content: string): MatchKind {
    if (!titleMatches(def, content)) return null;
    return missingLabels(def, content).length === 0 ? "match" : "near";
}

/** Một tin thành một dòng của sheet (chưa có cột STT); null trừ khi `classifyByDefinition` là "match". `ts` (giờ gửi) dùng cho bộ đổi cần giờ gửi. */
export function parseRowByDefinition(def: ReportDefinition, content: string, ts: number): Record<string, Cell> | null {
    if (classifyByDefinition(def, content) !== "match") return null;
    const f = readLabels(def, content);
    const row: Record<string, Cell> = {};
    for (const col of def.columns) {
        const found = col.labels.map(labelKey).find((k) => f.has(k));
        row[col.column] = convert(col.convert, found === undefined ? undefined : f.get(found), { ts });
    }
    return row;
}

/** Một tin đúng tiêu đề nhưng thiếu nhãn bắt buộc: bỏ qua thì người dùng không biết, nên ghi ra file "cần xem". */
export interface ReviewItem {
    code: string;
    msgId: string;
    ts: number;
    reason: "thieu-nhan";
    missing: string[];
}

/**
 * Các dòng của báo cáo `def` cho ngày `day`: tin chữ, gửi trong chính ngày đó (giờ Việt Nam) tới hết phút của `window.cutoff` (08:30 còn lấy, 08:31 không).
 * Mỗi tin một dòng, xếp theo giờ gửi rồi mã tin; cột STT từ 1. Tin gần giống (thiếu nhãn bắt buộc) trong khung giờ thành mục cần xem.
 */
export function rowsInWindow(def: ReportDefinition, messages: SourceMessage[], day: string): { rows: Array<Record<string, Cell>>; review: ReviewItem[] } {
    const cutoff = parseCutoff(def.window.cutoff);
    const found: Array<{ ts: number; id: string; row: Record<string, Cell> }> = [];
    const review: ReviewItem[] = [];
    for (const m of messages) {
        if (m.msgType !== "desktop.text" || vietnamDay(m.ts) !== day) continue;
        const { hour, minute } = vietnamHourMinute(m.ts);
        if (hour * 60 + minute > cutoff) continue;
        const kind = classifyByDefinition(def, m.content);
        if (kind === "match") found.push({ ts: m.ts, id: m.msgId, row: parseRowByDefinition(def, m.content, m.ts)! });
        else if (kind === "near") review.push({ code: def.code, msgId: m.msgId, ts: m.ts, reason: "thieu-nhan", missing: missingLabels(def, m.content) });
    }
    found.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
    review.sort((a, b) => a.ts - b.ts || a.msgId.localeCompare(b.msgId));
    return { rows: found.map((r, i) => ({ [def.sttColumn]: i + 1, ...r.row })), review };
}
