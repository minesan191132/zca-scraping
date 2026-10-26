import type { UpdateResult } from "./updateMaster.js";
import type { MasterKind } from "./masterStore.js";

/** Các dòng báo kết quả của một lần cập nhật file tổng (thuần). */
export function summarize(kind: MasterKind, setId: string, day: string, r: UpdateResult, dryRun: boolean): string[] {
    const head = `[${kind}] bộ ${setId}, ngày ${day}:`;
    if (dryRun) return [`${head} CHẠY THỬ, sẽ ghi ${r.cells.length} ô, chưa ghi gì`, ...r.cells.map((c) => `  ${c.sheet}!${c.cell} = ${c.value}  (${c.note})`), ...reviewLines(kind, r)];
    if (r.written === 0) return [`${head} không có ô nào cần ghi vào ${r.file}`, ...reviewLines(kind, r)];
    return [`${head} đã ghi ${r.written} ô vào ${r.file} (sao lưu: ${r.backup})`, ...(r.warning ? [`[${kind}] CẢNH BÁO: ${r.warning}`] : []), ...reviewLines(kind, r)];
}

function reviewLines(kind: MasterKind, r: UpdateResult): string[] {
    if (r.review.length === 0) return [];
    const list = r.review.map((x) => [x.school, x.khuVuc, x.room].filter((p) => p !== null && p !== "").join(" / ")).join("; ");
    return [`[${kind}] ${r.review.length} mục cần xem (không khớp dòng nào hoặc mơ hồ): ${list}`];
}
