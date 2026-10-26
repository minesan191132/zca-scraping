/**
 * Ngày và giờ cho báo cáo nghỉ phép. Mọi ngày là ngày dương lịch thuần (không múi giờ): dùng `Date.UTC` để không lệch ngày theo máy.
 */
export interface Ymd {
    y: number;
    m: number;
    d: number;
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** `YYYY-MM-DD` có thật (không nhận 2026-02-30, không nhận dạng khác). */
export function parseIso(v: unknown): Ymd | null {
    if (typeof v !== "string") return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
    if (!m) return null;
    const ymd = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
    const t = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d));
    return t.getUTCFullYear() === ymd.y && t.getUTCMonth() === ymd.m - 1 && t.getUTCDate() === ymd.d ? ymd : null;
}

export const isoOf = (x: Ymd): string => `${x.y}-${pad(x.m)}-${pad(x.d)}`;

/** Thứ tự các số trong ngày in trên ảnh: `MDY` là tháng/ngày/năm (kiểu Mỹ), `DMY` là ngày/tháng/năm. */
export type DateOrder = "MDY" | "DMY";

/**
 * Đổi ngày agent chép NGUYÊN VĂN từ ảnh (ví dụ "10/05/2026", "5-10-26") sang `YYYY-MM-DD` theo `order`. Dạng ISO đi qua nguyên. Nếu theo `order` không ra ngày thật
 * nhưng theo thứ tự kia ra ngày thật (ví dụ "25/12/2026" khi order là MDY) thì dùng thứ tự kia; không thì `null`. Nhờ đó model không phải đoán đâu là ngày đâu là tháng,
 * điều làm cùng một ảnh lúc đọc đúng lúc đọc sai.
 */
export function parsePrintedDate(v: unknown, order: DateOrder): string | null {
    if (typeof v !== "string") return null;
    const t = v.trim();
    const iso = parseIso(t);
    if (iso) return isoOf(iso);
    const m = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4}|\d{2})$/.exec(t);
    if (!m) return null;
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const build = (month: number, day: number): string | null => {
        const x = parseIso(`${year}-${pad(month)}-${pad(day)}`);
        return x ? isoOf(x) : null;
    };
    return order === "MDY" ? (build(a, b) ?? build(b, a)) : (build(b, a) ?? build(a, b));
}
export const dmyOf = (x: Ymd): string => `${pad(x.d)}/${pad(x.m)}/${x.y}`;
export const dayNumber = (x: Ymd): number => Math.floor(Date.UTC(x.y, x.m - 1, x.d) / 86_400_000);

/** Chủ nhật = 1, thứ hai = 2, ..., thứ bảy = 7: đúng cách đánh số của Excel `WEEKDAY(ngày, 1)` và của cột THỨ trên ảnh. */
export const weekdayExcel = (x: Ymd): number => new Date(Date.UTC(x.y, x.m - 1, x.d)).getUTCDay() + 1;

/** Số ngày `a` trừ `b` (dương khi `a` sau `b`). */
export const compareYmd = (a: Ymd, b: Ymd): number => dayNumber(a) - dayNumber(b);

/** Số ngày từ `from` đến `to` (gồm cả hai đầu) không tính Chủ nhật: đúng công thức SỐ NGÀY của file mẫu. Khoảng ngược hoặc dài quá 400 ngày thì 0. */
export function countNonSundays(from: Ymd, to: Ymd): number {
    const a = dayNumber(from);
    const b = dayNumber(to);
    if (b < a || b - a > 400) return 0;
    let n = 0;
    for (let i = a; i <= b; i++) if (new Date(i * 86_400_000).getUTCDay() !== 0) n += 1;
    return n;
}

/** `8:00`, `08:00`, `13:30`, `8h30`, `12` thành số giờ thập phân (13:30 là 13,5). Dạng khác hoặc giờ không có thật thì null. */
export function parseHour(v: unknown): number | null {
    if (typeof v !== "string") return null;
    const m = /^\s*(\d{1,2})(?:\s*[:hH]\s*(\d{2}))?\s*$/.exec(v);
    if (!m) return null;
    const h = Number(m[1]);
    const min = m[2] === undefined ? 0 : Number(m[2]);
    if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
    return h + min / 60;
}
