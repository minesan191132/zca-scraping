const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` of an epoch-ms instant on the Vietnam wall clock. */
export function vietnamDay(ts: number): string {
    const d = new Date(ts + VN_OFFSET_MS);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayVietnam(now: number = Date.now()): string {
    return vietnamDay(now);
}

/** Giờ:phút trên đồng hồ Việt Nam của một mốc epoch-ms. */
export function vietnamHourMinute(ts: number): { hour: number; minute: number } {
    const d = new Date(ts + VN_OFFSET_MS);
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

/** `HHmm` trên đồng hồ Việt Nam (vd "1042"), dùng đóng dấu giờ chạy thực tế vào tên file xuất. */
export function hhmmVietnam(ts: number): string {
    const { hour, minute } = vietnamHourMinute(ts);
    return `${pad(hour)}${pad(minute)}`;
}
