import { excelDateSerialForDay, type FileLayout, type FormulaCell, type HeaderCell } from "../lesson/statusReportLayout.js";
import type { Cell } from "../types/index.js";
import type { ReportDefinition } from "./types.js";

export interface FillParts {
    layout: FileLayout;
    rows: Array<Record<string, Cell>>;
    headerCells: HeaderCell[];
    formulaCells: FormulaCell[];
}

/**
 * Dữ liệu điền Excel của một báo cáo, cùng hình dạng mà lớp điền hiện có nhận (FileLayout, dòng, ô tiêu đề, ô công thức).
 * Không có dòng nào: mẫu có sẵn dữ liệu mẫu ở dòng đầu và script Excel giữ lại 1 dòng khi 0 dòng, không ghi gì vào đó, nên truyền một dòng toàn ô trống
 * để dòng mẫu bị xoá sạch (file ra bảng trắng 1 dòng). Dòng TỔNG của mẫu là =COUNTA(C4), một ô, nên được viết lại theo đúng vùng dữ liệu (tối thiểu 1 dòng).
 */
export function buildFillParts(def: ReportDefinition, rows: Array<Record<string, Cell>>, day: string, reporter?: string): FillParts {
    const t = def.template;
    const layout: FileLayout = { templateFile: t.file, sheet: t.sheet, firstDataRow: t.firstDataRow, totalRowBefore: t.totalRowBefore, lastColumn: t.lastColumn };
    if (t.copyFirstRowFormat !== undefined) layout.copyFirstRowFormat = t.copyFirstRowFormat;
    if (t.deleteSheets !== undefined) layout.deleteSheets = t.deleteSheets;

    const headerCells: HeaderCell[] = [{ ref: def.header.dateCell, value: excelDateSerialForDay(day), numberFormat: "dd/mm/yyyy" }];
    if (reporter && def.header.reporterCell) headerCells.push({ ref: def.header.reporterCell, value: `${def.header.reporterPrefix ?? ""}${reporter}` });

    const col = def.total.column;
    const last = t.firstDataRow + Math.max(rows.length, 1) - 1;
    return {
        layout,
        rows: rows.length > 0 ? rows : [{ [def.sttColumn]: null }],
        headerCells,
        formulaCells: [{ ref: `${col}${last + 1}`, formula: `COUNTA(${col}${t.firstDataRow}:${col}${last})` }],
    };
}
