import fs from "node:fs";
import path from "node:path";
import { config } from "../../config.js";
import { BUILTIN_DEFINITIONS } from "./builtin/index.js";
import type { ReportDefinition } from "./types.js";
import { validateDefinition } from "./validate.js";

/** Các định nghĩa nạp được, và mọi vấn đề gặp khi nạp (file hỏng, không hợp lệ, trùng mã): người gọi in ra, không dừng. */
export interface LoadResult {
    defs: ReportDefinition[];
    problems: string[];
}

/** Thư mục định nghĩa của khách: `<dataDir>/definitions/*.json`. */
export const customDefinitionsDir = (): string => path.join(config.dataDir, "definitions");

/**
 * Định nghĩa dựng sẵn (gộp trong mã) cộng các file `*.json` của `customDir`, đọc theo thứ tự tên file. Không bao giờ ném:
 * file lỗi cú pháp hay không hợp lệ chỉ thêm một dòng vào `problems` (tên file và lỗi), các file khác vẫn nạp.
 * Trùng mã với bản dựng sẵn thì bản dựng sẵn thắng; trùng giữa hai file của khách thì file đầu theo tên thắng. Cả hai đều có cảnh báo.
 */
export function loadDefinitions(customDir: string | null): LoadResult {
    const defs = [...BUILTIN_DEFINITIONS];
    const problems: string[] = [];
    if (customDir === null) return { defs, problems };

    let names: string[];
    try {
        names = fs.readdirSync(customDir).filter((n) => n.toLowerCase().endsWith(".json")).sort();
    } catch (e) {
        // Thiếu thư mục là bình thường (khách chưa thêm báo cáo nào).
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") problems.push(`${customDir}: không đọc được thư mục (${(e as Error).message})`);
        return { defs, problems };
    }

    const builtinCodes = new Set(BUILTIN_DEFINITIONS.map((d) => d.code));
    const fromFile = new Map<string, string>();
    for (const name of names) {
        let raw: unknown;
        try {
            raw = JSON.parse(fs.readFileSync(path.join(customDir, name), "utf8").replace(/^﻿/, ""));
        } catch (e) {
            problems.push(`${name}: không đọc được JSON (${(e as Error).message})`);
            continue;
        }
        const r = validateDefinition(raw);
        if (!r.ok) {
            problems.push(`${name}: định nghĩa không hợp lệ: ${r.errors.join("; ")}`);
            continue;
        }
        const code = r.def.code;
        if (builtinCodes.has(code)) {
            problems.push(`${name}: mã ${code} trùng báo cáo dựng sẵn, bỏ qua file này`);
            continue;
        }
        const first = fromFile.get(code);
        if (first !== undefined) {
            problems.push(`${name}: mã ${code} đã có ở ${first}, bỏ qua file này`);
            continue;
        }
        fromFile.set(code, name);
        defs.push(r.def);
    }
    return { defs, problems };
}

/** Mốc giờ của bốn báo cáo kỹ thuật lấy từ `config.techReports` (người dùng đổi ở đó), thay mốc ghi trong định nghĩa. Trả bản sao; mã khác giữ nguyên. */
const TECH_CUTOFFS: Record<string, () => string> = {
    attendanceStart: () => config.techReports.attendanceStartUntil,
    attendanceEnd: () => config.techReports.attendanceEndUntil,
    shiftStart: () => config.techReports.shiftStartUntil,
    shiftEnd: () => config.techReports.shiftEndUntil,
};

export function withConfigCutoffs(defs: ReportDefinition[]): ReportDefinition[] {
    return defs.map((d) => {
        const cutoff = TECH_CUTOFFS[d.code];
        return cutoff ? { ...d, window: { ...d.window, cutoff: cutoff() } } : d;
    });
}
