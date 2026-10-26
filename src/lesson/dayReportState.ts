import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "../../config.js";
import { writeFileAtomic } from "../core/atomicWrite.js";
import type { TechKey } from "./techReport.js";
import type { Cell } from "../types/index.js";

/** Các báo cáo theo ngày dựng bằng Excel từ các dòng của cả ngày (vệ sinh, nội quy, biên bản): mỗi báo cáo của mỗi bộ có một file trạng thái riêng. */
export type DayReportKey = "cleaning" | "attendance" | "minutes" | TechKey;

/** Bản đã dựng gần nhất của một báo cáo theo ngày: ngày, chữ ký của các dòng đã ghi, và tên file. */
export interface DayBuilt {
    day: string;
    signature: string;
    file: string;
}

/** Trạng thái của một báo cáo của một bộ: `data/.<báo cáo>-report.<id bộ>.json` (mỗi bộ có file riêng trong thư mục riêng, nên chữ ký và tên file riêng). */
export const dayBuiltPath = (key: DayReportKey, setId: string): string => path.join(config.dataDir, `.${key}-report.${setId}.json`);

/** Chữ ký nội dung của các dòng sẽ ghi vào file: cùng dòng ra cùng chữ ký, đổi bất kỳ ô nào ra chữ ký khác; không dòng nào cũng có chữ ký riêng. */
export function rowsSignature(rows: Array<Record<string, Cell>>): string {
    return createHash("sha1").update(JSON.stringify(rows)).digest("hex");
}

/**
 * Có cần dựng lại file của `day` không: chưa dựng lần nào, sang ngày khác, các dòng đổi, hoặc file đã dựng không còn trên đĩa. Cùng ngày và cùng các dòng thì KHÔNG dựng lại,
 * nên giờ trong tên file chỉ đổi khi có dữ liệu mới (một vòng của runner không còn mở Excel dựng lại những file không có gì mới).
 */
export function dayNeedsRebuild(prev: DayBuilt | null, day: string, signature: string, fileExists: (name: string) => boolean): boolean {
    if (!prev || prev.day !== day || prev.signature !== signature) return true;
    return !fileExists(prev.file);
}

const isBuilt = (v: unknown): v is DayBuilt => {
    const r = v as Record<string, unknown> | null;
    return typeof r === "object" && r !== null && typeof r.day === "string" && typeof r.signature === "string" && typeof r.file === "string";
};

/** File thiếu, hỏng hoặc sai dạng đều đọc ra null (chỉ khiến lần sau dựng lại một lần). */
export function readDayBuilt(file: string): DayBuilt | null {
    try {
        const v: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
        return isBuilt(v) ? { day: v.day, signature: v.signature, file: v.file } : null;
    } catch {
        return null;
    }
}

export function writeDayBuilt(state: DayBuilt, file: string): void {
    writeFileAtomic(file, JSON.stringify(state, null, 2));
}
