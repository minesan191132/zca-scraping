import { classifyEndOfShiftTitle, parseEndOfShift } from "./cleaningReport.js";
import { splitRooms } from "./internetSpeedReport.js";
import { fold } from "./parseReport.js";
import { vietnamDay } from "./time.js";
import type { MinutesForMessage, MinutesItem } from "../minutes/measures.js";
import type { SourceMessage } from "../types/index.js";

/** Một biên bản của một trường (một dòng của file QUẢN LÝ BIÊN BẢN). */
export interface MinutesEntry {
    /** Tên trường đúng như dòng "Tên Trường" của tin ("TH LƯƠNG THẾ VINH"), giống báo cáo vệ sinh (mẫu không có cột CẤP). */
    tenTruong: string;
    khuVuc: string;
    /** Các phòng máy của tin, nối bằng dấu phẩy ("PM1,PM3"). */
    pm: string;
    /** Ngày của tin báo cáo (YYYY-MM-DD). */
    ngay: string;
    item: MinutesItem;
    thoiGian: number;
}

/**
 * Mỗi BIÊN BẢN một dòng, từ các tin "CÔNG VIỆC CUỐI CA LÀM" thỏa `include(ts)` có ảnh biên bản đã đọc (`minutes`: msgId của tin -> các biên bản). Một biên bản được tính MỘT lần dù bộ
 * ảnh gắn vào nhiều tin của cùng trường (gửi lại tin báo cáo): tin MUỚI hơn quyết định PM và ngày. Tin không có ảnh biên bản thì không cho dòng nào. Thứ tự là thứ tự tin gửi, rồi
 * thứ tự ảnh.
 */
export function minutesEntries(messages: SourceMessage[], include: (ts: number) => boolean, minutes: Map<string, MinutesForMessage>): MinutesEntry[] {
    const byKey = new Map<string, MinutesEntry>();
    for (const m of [...messages].sort((a, b) => a.ts - b.ts)) {
        if (!include(m.ts)) continue;
        const found = minutes.get(m.msgId);
        const e = found && classifyEndOfShiftTitle(m.content) ? parseEndOfShift(m.content) : null;
        if (!found || !e) continue;
        const school = { tenTruong: e.tenTruong, khuVuc: e.khuVuc.trim().toUpperCase() };
        const pm = splitRooms(e.phongMay).join(",");
        for (const item of found.items) {
            const key = `${fold(school.tenTruong)}|${fold(school.khuVuc)}|${item.key}`;
            byKey.set(key, { ...school, pm, ngay: vietnamDay(m.ts), item, thoiGian: m.ts });
        }
    }
    return [...byKey.values()];
}
