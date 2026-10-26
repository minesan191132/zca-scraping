import type { InternetSpeedEntry } from "../lesson/internetSpeedReport.js";
import type { MaintenanceEntry } from "../lesson/maintenanceReport.js";
import { excelDateSerialForDay } from "../lesson/statusReportLayout.js";
import { vietnamDay } from "../lesson/time.js";
import type { MasterRow } from "./masterIndex.js";
import { findSchoolRow, type Match } from "./masterMatch.js";
import { roomKey, schoolKeys } from "./masterKeys.js";

export interface PatchCell {
    sheet: string;
    cell: string;
    value: number;
    note: string;
    /** Giờ của tin tạo ra ô này: khi nhiều mục cùng ghi một ô thì mục có giờ MUỘN NHẤT thắng. */
    ts?: number;
}

export interface ReviewItem {
    school: string;
    khuVuc: string;
    room: string | null;
    msgId: string;
    /** khong_khop: không có dòng nào; mo_ho: nhiều dòng không phân biệt được; khu_vuc_khac: tên khớp nhưng khu vực của dòng khác khu vực của tin (trường khác cùng tên). */
    reason: "khong_khop" | "mo_ho" | "khu_vuc_khac";
}

export interface PatchResult {
    cells: PatchCell[];
    review: ReviewItem[];
}

const serialOf = (ts: number): number => excelDateSerialForDay(vietnamDay(ts));

const reasonOf = (m: Exclude<Match, { kind: "ok" }>): ReviewItem["reason"] => (m.kind === "none" ? "khong_khop" : m.kind === "ambiguous" ? "mo_ho" : "khu_vuc_khac");

/** Mỗi ô chỉ ghi MỘT lần: nhiều mục cùng ô (nhiều ngày, hoặc cùng phòng viết khác nhau) thì lấy mục có giờ muộn nhất; giữ thứ tự xuất hiện đầu tiên của ô. */
export function lastPerCell(cells: PatchCell[]): PatchCell[] {
    const best = new Map<string, PatchCell>();
    for (const c of cells) {
        const key = `${c.sheet}!${c.cell}`;
        const prev = best.get(key);
        if (!prev || (c.ts ?? 0) >= (prev.ts ?? 0)) best.set(key, c);
    }
    return [...best.values()];
}

/** Tệp THỜI GIAN CHƯA BẢO TRÌ: ô BẢO TRÌ GN của trường = ngày của tin; không bao giờ lùi ngày, không ghi lại giá trị đang có. */
export function maintenancePatch(entries: MaintenanceEntry[], rows: MasterRow[]): PatchResult {
    const cells: PatchCell[] = [];
    const review: ReviewItem[] = [];
    for (const e of entries) {
        const m = findSchoolRow(rows, schoolKeys(e.cap, e.tenTruong, e.coSo, e.khuVuc), e.khuVuc, null);
        if (m.kind !== "ok") {
            review.push({ school: `${e.cap} ${e.tenTruong}`.trim(), khuVuc: e.khuVuc, room: null, msgId: e.maTinNhan, reason: reasonOf(m) });
            continue;
        }
        const serial = serialOf(e.thoiGian);
        if (m.row.date !== null && serial <= m.row.date) continue;
        cells.push({ sheet: m.row.sheet, cell: m.row.dateRef, value: serial, note: `${e.cap} ${e.tenTruong}: bảo trì ${vietnamDay(e.thoiGian)}`, ts: e.thoiGian });
    }
    return { cells: lastPerCell(cells), review };
}

/**
 * Tệp TRẠNG THÁI KẾT NỐI INTERNET: ô TỐC ĐỘ và NGÀY CẬP NHẬT của đúng (trường, phòng). Tốc độ lấy từ dòng "Tốc độ Internet" của tin (trống hoặc 0 thì 0, XẾP LOẠI ra D); chưa
 * có tốc độ đọc được thì không ghi gì. Ngày cũ hơn ngày trong ô thì bỏ cả mục; cùng ngày thì chỉ ghi nếu tốc độ đổi.
 */
export function internetSpeedPatch(entries: InternetSpeedEntry[], rows: MasterRow[]): PatchResult {
    const cells: PatchCell[] = [];
    const review: ReviewItem[] = [];
    for (const e of entries) {
        const speed = e.mbps;
        if (speed === null) continue;
        const m = findSchoolRow(rows, schoolKeys(e.cap, e.tenTruong, e.coSo, e.khuVuc), e.khuVuc, roomKey(e.phongMay));
        if (m.kind !== "ok") {
            review.push({ school: `${e.cap} ${e.tenTruong}`.trim(), khuVuc: e.khuVuc, room: e.phongMay, msgId: e.maTinNhan, reason: reasonOf(m) });
            continue;
        }
        const serial = serialOf(e.thoiGian);
        if (m.row.date !== null && serial < m.row.date) continue;
        const label = `${e.cap} ${e.tenTruong} ${e.phongMay}`;
        if (m.row.speedRef && m.row.speed !== speed) cells.push({ sheet: m.row.sheet, cell: m.row.speedRef, value: speed, note: `${label}: ${speed} Mbps`, ts: e.thoiGian });
        if (m.row.date !== serial) cells.push({ sheet: m.row.sheet, cell: m.row.dateRef, value: serial, note: `${label}: cập nhật ${vietnamDay(e.thoiGian)}`, ts: e.thoiGian });
    }
    return { cells: lastPerCell(cells), review };
}
