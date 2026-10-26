import { excelDateSerialForDay, type FileLayout, type FormulaCell, type HeaderCell } from "./statusReportLayout.js";
import type { TechKey } from "./techReport.js";
import type { Cell } from "../types/index.js";

/**
 * Bốn sheet của mẫu 05 - FORM EXCEL BAO CAO KY THUAT.xlsx; mỗi báo cáo xuất thành MỘT file riêng nên ba sheet còn lại bị xoá khỏi file (như INTERNET/NETSUPPORT dùng chung một mẫu).
 * Bảng bắt đầu ở dòng 4, dòng TỔNG ở dòng 8 của mẫu (4 dòng dữ liệu mẫu 4-7), `dateRef` là ô "Ngày báo cáo" (=TODAY() trong mẫu).
 */
const TEMPLATE_FILE = "05 - FORM EXCEL BAO CAO KY THUAT.xlsx";
const SHEETS = { attendanceStart: "ĐẦU BUỔI", attendanceEnd: "CUỐI BUỔI", shiftStart: "ĐẦU CA", shiftEnd: "CUỐI CA" } as const satisfies Record<TechKey, string>;
const LAST_COLUMN: Record<TechKey, string> = { attendanceStart: "J", attendanceEnd: "J", shiftStart: "K", shiftEnd: "U" };
const DATE_REF: Record<TechKey, string> = { attendanceStart: "J2", attendanceEnd: "J2", shiftStart: "K2", shiftEnd: "U2" };

const layoutOf = (key: TechKey): FileLayout => ({
    templateFile: TEMPLATE_FILE,
    sheet: SHEETS[key],
    firstDataRow: 4,
    totalRowBefore: 8,
    lastColumn: LAST_COLUMN[key],
    copyFirstRowFormat: true,
    deleteSheets: (Object.keys(SHEETS) as TechKey[]).filter((k) => k !== key).map((k) => SHEETS[k]),
});

export const TECH_LAYOUT: Record<TechKey, FileLayout> = {
    attendanceStart: layoutOf("attendanceStart"),
    attendanceEnd: layoutOf("attendanceEnd"),
    shiftStart: layoutOf("shiftStart"),
    shiftEnd: layoutOf("shiftEnd"),
};

/** Ô A2 của mỗi sheet; mẫu ghi sẵn "Nhân viên báo cáo: Nguyễn Thu Hà". */
const REPORTER_REF = "A2";

/** Ô "Ngày báo cáo" thành số ngày của `day` (dd/mm/yyyy) thay cho =TODAY(); có `reporter` thì ô A2 ghi tên người đó thay tên trong mẫu. */
export function techHeaderCells(key: TechKey, day: string, reporter?: string): HeaderCell[] {
    const cells: HeaderCell[] = [{ ref: DATE_REF[key], value: excelDateSerialForDay(day), numberFormat: "dd/mm/yyyy" }];
    if (reporter) cells.push({ ref: REPORTER_REF, value: `Nhân viên báo cáo: ${reporter}` });
    return cells;
}

/** Dòng TỔNG của mẫu là =COUNTA(C4), một ô, nên không dài ra cùng bảng: viết lại theo đúng vùng dữ liệu (tối thiểu 1 dòng, như script Excel). */
export function techFormulaCells(key: TechKey, rowCount: number): FormulaCell[] {
    const layout = TECH_LAYOUT[key];
    const last = layout.firstDataRow + Math.max(rowCount, 1) - 1;
    return [{ ref: `C${last + 1}`, formula: `COUNTA(C${layout.firstDataRow}:C${last})` }];
}

/**
 * Không có tin nào: mẫu có sẵn dữ liệu mẫu ở dòng đầu (TH Lương Thế Vinh...) và script Excel giữ lại 1 dòng khi 0 dòng, không ghi gì vào đó.
 * Truyền một dòng toàn ô trống để dòng mẫu bị xoá sạch, file ra bảng trắng 1 dòng.
 */
export function techRowsForFill(rows: Array<Record<string, Cell>>): Array<Record<string, Cell>> {
    return rows.length > 0 ? rows : [{ A: null }];
}
