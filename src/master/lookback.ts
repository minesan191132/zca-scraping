import { addDays } from "../lesson/time.js";

/**
 * Số ngày gần nhất mà các CLI cập nhật file tổng xét lại mỗi lần chạy. Xử lý lại ngày cũ vô hại (bản vá bỏ ô đã đúng và không lùi ngày) và cứu được tin của ngày hôm trước khi
 * chu trình cuối ngày lỗi (file tổng đang mở trong Excel, chu trình chạy sau nửa đêm...).
 */
export const LOOKBACK_DAYS = 7;

/** `n` ngày kết thúc ở `day`, ngày cũ nhất đứng trước ("2026-10-07", "2026-10-08", "2026-10-09"). */
export function recentDays(day: string, n: number): string[] {
    return Array.from({ length: n }, (_, i) => addDays(day, i - (n - 1)));
}
