import { config } from "../../config.js";
import { SECTIONS, SETTINGS } from "../config/configDoc.js";

/**
 * In cấu hình hiện tại cùng phần mô tả của từng khóa ra stdout dưới dạng JSON, để công cụ bên ngoài (bảng vận hành Electron) dựng form.
 * Chỉ đọc. Dòng JSON đứng sau dấu `@@JSON@@` vì nạp `config.ts` có thể in thêm chữ khác ra stdout.
 *
 *   npm run config:dump
 */
const getPath = (obj: unknown, path: string): unknown =>
    path.split(".").reduce<unknown>((o, k) => (o === undefined || o === null ? undefined : (o as Record<string, unknown>)[k]), obj);

const settings = SETTINGS.map((s) => ({
    section: s.section,
    path: s.path,
    unit: s.unit,
    default: s.default === undefined ? null : s.default,
    hasDefault: s.default !== undefined,
    defaultLabel: s.defaultLabel ?? null,
    readers: s.readers,
    note: s.note,
    value: getPath(config, s.path) ?? null,
}));

console.log("@@JSON@@" + JSON.stringify({ sections: SECTIONS, settings }));
