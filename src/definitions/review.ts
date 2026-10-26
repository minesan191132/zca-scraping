import fs from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "../core/atomicWrite.js";
import { setOutputDir } from "../core/paths.js";
import type { ReviewItem } from "./engine.js";

/**
 * File "cần xem" của một báo cáo định nghĩa: `output/<bộ>/canxem_<mã>_<ngày>.json`. Tiền tố `canxem_` có chủ đích: `review_<ngày>_<buổi>.json` là
 * file của báo cáo đầu/cuối buổi dạy, hình dạng khác, và `runner:status` cùng skill xu-ly-muc-can-xem đọc nó; trùng tiền tố thì bị đọc sai.
 */
export const reviewPath = (setId: string, code: string, day: string): string => path.join(setOutputDir(setId), `canxem_${code}_${day}.json`);

/** Ghi các tin gần khớp; danh sách rỗng thì xóa file (lần dựng này không còn tin nào cần xem). */
export function writeReview(file: string, items: ReviewItem[]): void {
    if (items.length === 0) {
        fs.rmSync(file, { force: true });
        return;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    writeFileAtomic(file, JSON.stringify(items, null, 2));
}
