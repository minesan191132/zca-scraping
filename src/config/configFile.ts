import fs from "node:fs";
import path from "node:path";
import { appHome } from "../core/paths.js";

/** Kết quả ghi đè cấu hình: các khóa đã áp dụng và các cảnh báo (khóa lạ, sai kiểu, khóa chỉ đọc). */
export interface ConfigLoad {
    applied: string[];
    warnings: string[];
}

const kindOf = (v: unknown): string => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Ghi `overrides` lên `target` TẠI CHỖ (để các getter của `config` còn nguyên). Khóa không có trong `target` thì cảnh báo và bỏ;
 * kiểu khác kiểu của giá trị mặc định thì cảnh báo và giữ mặc định (mặc định `null` nhận chữ, vì đó là đường dẫn dò tự động); mảng được THAY chứ không nối;
 * object gộp đệ quy; khóa là getter (chỉ đọc) thì cảnh báo và bỏ.
 */
export function applyConfigOverrides(target: Record<string, unknown>, overrides: unknown, prefix = ""): ConfigLoad {
    const out: ConfigLoad = { applied: [], warnings: [] };
    if (!isPlainObject(overrides)) {
        if (prefix === "") out.warnings.push("config.json phải là một object ở ngoài cùng.");
        return out;
    }
    for (const [key, value] of Object.entries(overrides)) {
        const where = prefix === "" ? key : `${prefix}.${key}`;
        const desc = Object.getOwnPropertyDescriptor(target, key);
        if (desc === undefined) {
            out.warnings.push(`khóa lạ "${where}" trong config.json, bỏ qua.`);
            continue;
        }
        if (desc.get !== undefined) {
            out.warnings.push(`khóa "${where}" chỉ đọc (suy ra từ khóa khác), bỏ qua.`);
            continue;
        }
        const current = desc.value as unknown;
        // Object rỗng mặc định là một bảng tra do người dùng đặt khóa (vd groupAliases: { "tên nhóm thử": "tên nhóm thật" }), không phải một nhóm khóa cố định: thay nguyên khối.
        if (isPlainObject(current) && Object.keys(current).length === 0 && isPlainObject(value)) {
            target[key] = value;
            out.applied.push(where);
            continue;
        }
        if (isPlainObject(current) && isPlainObject(value)) {
            const sub = applyConfigOverrides(current, value, where);
            out.applied.push(...sub.applied);
            out.warnings.push(...sub.warnings);
            continue;
        }
        const sameKind = kindOf(current) === kindOf(value) || (current === null && typeof value === "string");
        if (!sameKind) {
            out.warnings.push(`khóa "${where}" sai kiểu: cần ${kindOf(current)}, có ${kindOf(value)}; giữ giá trị mặc định.`);
            continue;
        }
        target[key] = value;
        out.applied.push(where);
    }
    return out;
}

/** Đường dẫn `config.json`: nằm ở thư mục dữ liệu ghi được (`appHome`). */
export const configFilePath = (): string => path.join(appHome, "config.json");

/**
 * Đọc một file cấu hình JSON (bỏ BOM). Không có file thì coi như `{}`. Cú pháp lỗi thì `ok: false` kèm tên file; người gọi phải dừng bot,
 * vì chạy tiếp với mặc định rỗng thì bot không theo dõi nhóm nào mà không báo gì.
 */
export function readConfigFile(file: string): { ok: true; value: unknown } | { ok: false; message: string } {
    let text: string;
    try {
        text = fs.readFileSync(file, "utf8");
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return { ok: true, value: {} };
        return { ok: false, message: `không đọc được ${file}: ${(err as Error).message}` };
    }
    try {
        return { ok: true, value: JSON.parse(text.replace(/^\uFEFF/, "")) };
    } catch (err) {
        return { ok: false, message: `${file} không phải JSON hợp lệ: ${(err as Error).message}` };
    }
}
