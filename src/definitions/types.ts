import type { TITLE_KEYS } from "../lesson/spelling.js";
import type { ConverterName } from "./converters.js";

/** Nhóm tiêu đề có sẵn trong bảng chính tả (spelling.ts) mà một định nghĩa có thể mượn thay vì tự liệt kê. */
export type TitleScope = keyof typeof TITLE_KEYS;
/** Bộ chuẩn hóa nhãn gõ sai theo từng form IT (spelling.ts). Không có thì chỉ chuẩn hóa dấu, hoa thường và dấu câu. */
export type LabelScope = "attendance" | "shiftStart" | "shiftEnd";

/** Một cột Excel: các nhãn (đã qua `labelKey`) của tin đổ vào cột đó, và bộ đổi giá trị. */
export interface ColumnRule {
    column: string;
    labels: string[];
    convert: ConverterName;
}

/** Định nghĩa một báo cáo bằng dữ liệu: tin nào thuộc báo cáo, cột nào lấy nhãn nào, khung giờ, mẫu Excel. Xem docs/superpowers/specs/2026-10-24-bao-cao-dinh-nghia-bang-du-lieu-design.md. */
export interface ReportDefinition {
    code: string;
    label: string;
    /** Tiêu đề (dòng đầu của tin) tự liệt kê; so qua `titleKey`. */
    titles: string[];
    titleScope?: TitleScope;
    labelScope?: LabelScope;
    /** Nhãn (đã qua `labelKey`) bắt buộc có giá trị; thiếu thì tin là "gần giống" và vào mục cần xem. */
    requiredLabels: string[];
    sttColumn: string;
    columns: ColumnRule[];
    /** Nhãn mà các dòng tiếp theo không có dấu hai chấm được nối vào giá trị của nó. */
    continuationLabel?: string;
    window: { cutoff: string };
    template: {
        file: string;
        sheet: string;
        firstDataRow: number;
        totalRowBefore: number;
        lastColumn: string;
        deleteSheets?: string[];
        copyFirstRowFormat?: boolean;
    };
    header: { dateCell: string; reporterCell?: string; reporterPrefix?: string };
    total: { column: string };
}
