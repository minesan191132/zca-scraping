import type { ColumnRule, ReportDefinition } from "../types.js";

// Phần chung của bốn báo cáo kỹ thuật trên mẫu 05 - FORM EXCEL BAO CAO KY THUAT.xlsx (trước đây ở src/lesson/techReportRows.ts).
// Mỗi báo cáo xuất thành MỘT file riêng nên ba sheet kia bị xoá; bảng bắt đầu ở dòng 4, dòng TỔNG ở dòng 8 của mẫu.

/** Bốn sheet của mẫu, đúng thứ tự trong file; `deleteSheets` giữ thứ tự này. */
const SHEETS = ["ĐẦU BUỔI", "CUỐI BUỔI", "ĐẦU CA", "CUỐI CA"] as const;
type Sheet = (typeof SHEETS)[number];

/** Bốn cột đầu giống nhau ở cả bốn sheet: CẤP, TÊN TRƯỜNG, PHÂN HIỆU, PHƯỜNG / XÃ. */
export const SCHOOL_COLUMNS: ColumnRule[] = [
    { column: "B", labels: ["cap"], convert: "itLevel" },
    { column: "C", labels: ["ten truong"], convert: "text" },
    { column: "D", labels: ["phan hieu"], convert: "text" },
    { column: "E", labels: ["phuong xa"], convert: "text" },
];

/** Phần định nghĩa chung: thiếu "Tên Trường" thì tin vào mục cần xem; cột A là STT; ô A2 ghi người báo cáo; dòng TỔNG đếm cột C. */
export function techDefinition(o: {
    code: string;
    label: string;
    titleScope: NonNullable<ReportDefinition["titleScope"]>;
    labelScope: NonNullable<ReportDefinition["labelScope"]>;
    sheet: Sheet;
    lastColumn: string;
    cutoff: string;
    columns: ColumnRule[];
    continuationLabel?: string;
}): ReportDefinition {
    const def: ReportDefinition = {
        code: o.code,
        label: o.label,
        titles: [],
        titleScope: o.titleScope,
        labelScope: o.labelScope,
        requiredLabels: ["ten truong"],
        sttColumn: "A",
        columns: [...SCHOOL_COLUMNS, ...o.columns],
        window: { cutoff: o.cutoff },
        template: {
            file: "05 - FORM EXCEL BAO CAO KY THUAT.xlsx",
            sheet: o.sheet,
            firstDataRow: 4,
            totalRowBefore: 8,
            lastColumn: o.lastColumn,
            deleteSheets: SHEETS.filter((s) => s !== o.sheet),
            copyFirstRowFormat: true,
        },
        header: { dateCell: `${o.lastColumn}2`, reporterCell: "A2", reporterPrefix: "Nhân viên báo cáo: " },
        total: { column: "C" },
    };
    if (o.continuationLabel !== undefined) def.continuationLabel = o.continuationLabel;
    return def;
}

/** Cột F..J của hai điểm danh: giờ lấy từ dòng "Thời gian", không đọc được thì giờ gửi; thực tập "0" thì trống. */
export const ATTENDANCE_COLUMNS: ColumnRule[] = [
    { column: "F", labels: ["thoi gian"], convert: "clockOrSentTime" },
    { column: "G", labels: ["tong so it"], convert: "numberOrText" },
    { column: "H", labels: ["ten it ctv"], convert: "text" },
    { column: "I", labels: ["thuc tap it"], convert: "bulletListSkipNone" },
    { column: "J", labels: ["nhan vien vang"], convert: "numberOrText" },
];
