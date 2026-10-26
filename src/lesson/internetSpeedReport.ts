import { fold } from "./parseReport.js";
import { parseMaintenanceMessage } from "./maintenanceReport.js";
import { parseEndOfShift } from "./cleaningReport.js";
import { toMbps } from "../speed/units.js";
import type { SourceMessage } from "../types/index.js";

export interface InternetMessage {
    cap: string;
    tenTruong: string;
    khuVuc: string;
    coSo: string;
    /** Các phòng máy của dòng "Phòng máy làm việc" (thường một phòng). */
    rooms: string[];
    /** Tốc độ Mbps của dòng "Tốc độ Internet"; null khi tin không có dòng đó hoặc ghi chữ không đọc ra số (xem `parseSpeedText`). */
    mbps: number | null;
}

/** Tách dòng "Phòng máy làm việc" ("PM2", "PM2, PM3") thành từng phòng, bỏ phần rỗng. */
export function splitRooms(value: string): string[] {
    return value.split(/[,;]/).map((r) => r.trim()).filter(Boolean);
}

/**
 * Đọc dòng "Tốc độ Internet" ra Mbps. Số kèm đơn vị thì đổi theo đơn vị ("500 kbps" thành 0,5; thiếu đơn vị thì coi là Mbps); để TRỐNG hoặc 0 thì 0 (theo docs/bao-cao-nhi.md: không có
 * mạng). Chữ không có số ("Không có mạng") hoặc đơn vị không đổi được (MB/s là byte) thì trả null: không ghi gì, chờ quy định. `text` null (tin không có dòng) trả null.
 */
export function parseSpeedText(text: string | null): number | null {
    if (text === null) return null;
    const t = text.trim();
    if (t === "") return 0;
    const m = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z/]*)$/.exec(t);
    if (!m) return null;
    const value = Number(m[1].replace(",", "."));
    return toMbps(value, m[2] || "Mbps");
}

/**
 * Tin "CÔNG VIỆC CUỐI CA LÀM": trường, khu vực, cơ sở, các phòng máy làm việc và tốc độ Internet. Tin không đúng tiêu đề, thiếu "Tên Trường" hoặc không có phòng máy nào thì trả null.
 */
export function parseInternetMessage(content: string): InternetMessage | null {
    const school = parseMaintenanceMessage(content);
    const e = school ? parseEndOfShift(content) : null;
    if (!school || !e) return null;
    const rooms = splitRooms(e.phongMay);
    return rooms.length > 0 ? { ...school, rooms, mbps: parseSpeedText(e.tocDo) } : null;
}

/** Một dòng của file TRẠNG THÁI KẾT NỐI INTERNET: một phòng máy của một trường. */
export interface InternetSpeedEntry {
    cap: string;
    tenTruong: string;
    khuVuc: string;
    coSo: string;
    phongMay: string;
    /** Tốc độ Mbps (0 khi không có mạng); null khi chưa có số để ghi. */
    mbps: number | null;
    thoiGian: number;
    maTinNhan: string;
}

/**
 * Mỗi (trường, cơ sở, khu vực, phòng máy) một dòng, từ các tin thỏa `include(ts)`: tin gửi SAU CÙNG có tốc độ đọc được thắng; tin sau không có tốc độ đọc được thì không xoá tốc độ của tin trước.
 * Thứ tự là thứ tự tin gửi (việc xếp D, C, B, A làm ở `buildInternetSpeedRows`).
 */
export function internetSpeedEntries(messages: SourceMessage[], include: (ts: number) => boolean): InternetSpeedEntry[] {
    const byKey = new Map<string, InternetSpeedEntry>();
    for (const m of [...messages].sort((a, b) => a.ts - b.ts)) {
        if (!include(m.ts)) continue;
        const parsed = parseInternetMessage(m.content);
        if (!parsed) continue;
        for (const phongMay of parsed.rooms) {
            const key = `${fold(parsed.tenTruong)}|${fold(parsed.coSo)}|${fold(parsed.khuVuc)}|${fold(phongMay)}`;
            const prev = byKey.get(key);
            byKey.set(key, {
                cap: parsed.cap,
                tenTruong: parsed.tenTruong,
                khuVuc: parsed.khuVuc,
                coSo: parsed.coSo,
                phongMay,
                mbps: parsed.mbps ?? prev?.mbps ?? null,
                thoiGian: m.ts,
                maTinNhan: m.msgId,
            });
        }
    }
    return [...byKey.values()];
}
