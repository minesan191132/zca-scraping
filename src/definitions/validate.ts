import { parseCutoff } from "../config/clockTime.js";
import { TITLE_KEYS } from "../lesson/spelling.js";
import { CONVERTER_NAMES } from "./converters.js";
import type { ReportDefinition } from "./types.js";

const CODE_RE = /^[A-Za-z][A-Za-z0-9]*$/;
const COLUMN_RE = /^[A-Z]{1,2}$/;
const CELL_RE = /^[A-Z]{1,2}[1-9][0-9]*$/;
const LABEL_SCOPES = ["attendance", "shiftStart", "shiftEnd"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");

/** Kiểm một định nghĩa đọc từ JSON; gom MỌI lỗi (mỗi lỗi nêu tên trường sai) và không ném, để một file hỏng không chặn các file khác. */
export function validateDefinition(raw: unknown): { ok: true; def: ReportDefinition } | { ok: false; errors: string[] } {
    if (!isObject(raw)) return { ok: false, errors: ["định nghĩa phải là một object"] };
    const errors: string[] = [];
    const d = raw;

    if (typeof d.code !== "string" || !CODE_RE.test(d.code)) errors.push(`code: phải là chữ và số, bắt đầu bằng chữ (đang là ${JSON.stringify(d.code)})`);
    if (!isString(d.label)) errors.push("label: phải là chữ, không rỗng");

    if (!isStringArray(d.titles)) errors.push("titles: phải là danh sách chữ");
    if (d.titleScope !== undefined && !(typeof d.titleScope === "string" && d.titleScope in TITLE_KEYS)) {
        errors.push(`titleScope: phải là một trong ${Object.keys(TITLE_KEYS).join(", ")} (đang là ${JSON.stringify(d.titleScope)})`);
    }
    if (isStringArray(d.titles) && d.titles.length === 0 && d.titleScope === undefined) errors.push("titles: rỗng và không có titleScope thì không tin nào khớp");
    if (d.labelScope !== undefined && !LABEL_SCOPES.includes(d.labelScope as string)) errors.push(`labelScope: phải là một trong ${LABEL_SCOPES.join(", ")} (đang là ${JSON.stringify(d.labelScope)})`);

    if (!isStringArray(d.requiredLabels) || d.requiredLabels.length === 0) errors.push("requiredLabels: phải có ít nhất một nhãn");
    if (typeof d.sttColumn !== "string" || !COLUMN_RE.test(d.sttColumn)) errors.push(`sttColumn: phải là một hoặc hai chữ cái hoa (đang là ${JSON.stringify(d.sttColumn)})`);
    if (d.continuationLabel !== undefined && !isString(d.continuationLabel)) errors.push("continuationLabel: phải là chữ");

    const seen = new Set<string>();
    if (typeof d.sttColumn === "string") seen.add(d.sttColumn);
    if (!Array.isArray(d.columns) || d.columns.length === 0) errors.push("columns: phải có ít nhất một cột");
    else {
        d.columns.forEach((c, i) => {
            const at = `columns[${i}]`;
            if (!isObject(c)) return void errors.push(`${at}: phải là object`);
            if (typeof c.column !== "string" || !COLUMN_RE.test(c.column)) errors.push(`${at}.column: phải là một hoặc hai chữ cái hoa (đang là ${JSON.stringify(c.column)})`);
            else if (seen.has(c.column)) errors.push(`${at}.column: cột ${c.column} bị dùng hai lần (kể cả cột STT)`);
            else seen.add(c.column);
            if (!isStringArray(c.labels) || c.labels.length === 0) errors.push(`${at}.labels: phải có ít nhất một nhãn`);
            if (!(CONVERTER_NAMES as readonly string[]).includes(c.convert as string)) errors.push(`${at}.convert: phải là một trong ${CONVERTER_NAMES.join(", ")} (đang là ${JSON.stringify(c.convert)})`);
        });
    }

    if (!isObject(d.window) || typeof d.window.cutoff !== "string") errors.push("window.cutoff: phải là chữ dạng HH:MM");
    else {
        try { parseCutoff(d.window.cutoff); } catch (e) { errors.push(`window.cutoff: ${(e as Error).message}`); }
    }

    const t = d.template;
    if (!isObject(t)) errors.push("template: phải là object");
    else {
        if (!isString(t.file)) errors.push("template.file: phải là chữ");
        if (!isString(t.sheet)) errors.push("template.sheet: phải là chữ");
        if (!Number.isInteger(t.firstDataRow) || (t.firstDataRow as number) < 1) errors.push("template.firstDataRow: phải là số nguyên từ 1");
        if (!Number.isInteger(t.totalRowBefore)) errors.push("template.totalRowBefore: phải là số nguyên");
        else if (Number.isInteger(t.firstDataRow) && (t.totalRowBefore as number) <= (t.firstDataRow as number)) errors.push("template.totalRowBefore: phải lớn hơn firstDataRow (dòng TỔNG nằm sau vùng dữ liệu)");
        if (typeof t.lastColumn !== "string" || !COLUMN_RE.test(t.lastColumn)) errors.push(`template.lastColumn: phải là một hoặc hai chữ cái hoa (đang là ${JSON.stringify(t.lastColumn)})`);
        if (t.deleteSheets !== undefined && !isStringArray(t.deleteSheets)) errors.push("template.deleteSheets: phải là danh sách chữ");
        if (t.copyFirstRowFormat !== undefined && typeof t.copyFirstRowFormat !== "boolean") errors.push("template.copyFirstRowFormat: phải là true hoặc false");
    }

    const h = d.header;
    if (!isObject(h)) errors.push("header: phải là object");
    else {
        if (typeof h.dateCell !== "string" || !CELL_RE.test(h.dateCell)) errors.push(`header.dateCell: phải là địa chỉ ô như J2 (đang là ${JSON.stringify(h.dateCell)})`);
        if (h.reporterCell !== undefined && !(typeof h.reporterCell === "string" && CELL_RE.test(h.reporterCell))) errors.push(`header.reporterCell: phải là địa chỉ ô như A2 (đang là ${JSON.stringify(h.reporterCell)})`);
        if (h.reporterPrefix !== undefined && typeof h.reporterPrefix !== "string") errors.push("header.reporterPrefix: phải là chữ");
    }

    if (!isObject(d.total) || typeof d.total.column !== "string" || !COLUMN_RE.test(d.total.column)) errors.push("total.column: phải là một hoặc hai chữ cái hoa");

    return errors.length > 0 ? { ok: false, errors } : { ok: true, def: raw as unknown as ReportDefinition };
}
