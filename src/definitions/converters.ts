import { parseSpeedText } from "../lesson/internetSpeedReport.js";
import { isNoneValue, itLevelValue } from "../lesson/spelling.js";
import { vietnamHourMinute } from "../lesson/time.js";
import type { Cell } from "../types/index.js";

/** Giờ trong tin ("9:00", "09h30", "9g30", "11h") thành phần ngày của Excel (0 <= x < 1); không đọc được thì null. */
export function parseClockFraction(text: string): number | null {
    const m = /^(\d{1,2})\s*[:hHgG]\s*(\d{2})?$/.exec(text.trim());
    if (!m) return null;
    const hour = Number(m[1]);
    const minute = m[2] === undefined ? 0 : Number(m[2]);
    return hour > 23 || minute > 59 ? null : (hour * 60 + minute) / 1440;
}

/** Tên các bộ đổi giá trị mà một định nghĩa báo cáo được phép dùng cho một cột. */
export const CONVERTER_NAMES = ["text", "numberOrText", "bulletList", "bulletListSkipNone", "roomNumbers", "leadingNumber", "clock", "clockOrSentTime", "speedMbps", "itLevel"] as const;
export type ConverterName = (typeof CONVERTER_NAMES)[number];

export interface ConvertContext {
    /** Giờ gửi của tin (ms), dùng khi tin không ghi giờ. */
    ts: number;
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

/**
 * Đổi giá trị chữ của một dòng nhãn thành ô Excel. `raw` là undefined khi tin không có dòng nhãn đó: mọi bộ coi như chuỗi rỗng,
 * riêng `speedMbps` trả null (không có dòng thì không ghi gì, khác với dòng để trống là 0).
 */
export function convert(name: ConverterName, raw: string | undefined, ctx: ConvertContext): Cell {
    const v = raw ?? "";
    switch (name) {
        case "text": return text(v);
        case "numberOrText": return numberOrText(v);
        case "bulletList": return bulletList(v);
        case "bulletListSkipNone": return bulletList(v, isNoneValue);
        case "roomNumbers": return roomNumbers(v);
        case "leadingNumber": return leadingNumber(v);
        case "clock": return parseClockFraction(v);
        case "clockOrSentTime": {
            // Tin cũ không có dòng "Thời gian", hoặc ghi chữ, thì lấy giờ gửi.
            const { hour, minute } = vietnamHourMinute(ctx.ts);
            return parseClockFraction(v) ?? (hour * 60 + minute) / 1440;
        }
        case "speedMbps": return raw === undefined ? null : parseSpeedText(raw);
        case "itLevel": return text(itLevelValue(v));
    }
}
