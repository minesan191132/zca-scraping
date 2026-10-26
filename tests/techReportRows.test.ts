import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { config } from "../config.js";
import { TECH_LAYOUT, techFormulaCells, techHeaderCells, techRowsForFill } from "../src/lesson/techReportRows.js";
import { readTemplateTitle } from "../src/lesson/statusReportLayout.js";
import { TECH_KEYS } from "../src/lesson/techReport.js";

test("techHeaderCells: ngày báo cáo là số ngày dd/mm/yyyy; A2 chỉ ghi khi có tên người", () => {
    assert.deepEqual(techHeaderCells("shiftEnd", "2026-10-22"), [{ ref: "U2", value: 46317, numberFormat: "dd/mm/yyyy" }]);
    assert.deepEqual(techHeaderCells("attendanceStart", "2026-10-22", "Chưa phân công"), [
        { ref: "J2", value: 46317, numberFormat: "dd/mm/yyyy" },
        { ref: "A2", value: "Nhân viên báo cáo: Chưa phân công" },
    ]);
});

test("techFormulaCells: TỔNG đếm đúng vùng dữ liệu, tối thiểu 1 dòng", () => {
    assert.deepEqual(techFormulaCells("attendanceStart", 0), [{ ref: "C5", formula: "COUNTA(C4:C4)" }]);
    assert.deepEqual(techFormulaCells("attendanceStart", 6), [{ ref: "C10", formula: "COUNTA(C4:C9)" }]);
});

test("techRowsForFill: không có dòng thì truyền một dòng trống để xoá dữ liệu mẫu", () => {
    assert.deepEqual(techRowsForFill([]), [{ A: null }]);
    assert.deepEqual(techRowsForFill([{ A: 1 }]), [{ A: 1 }]);
});

// Đối chiếu bố cục với file mẫu thật; bỏ qua khi máy này chưa có mẫu (data/ không nằm trong git).
const templatePath = path.join(config.dataDir, "mau bao cao new", TECH_LAYOUT.attendanceStart.templateFile);
const skip = fs.existsSync(templatePath) ? false : "chưa có data/mau bao cao new/05 - FORM EXCEL BAO CAO KY THUAT.xlsx";

test("bố cục khớp mẫu thật: sheet, dòng đầu bảng, dòng TỔNG, ô ngày =TODAY(), cột cuối, ba sheet còn lại bị xoá", { skip }, () => {
    const wb = XLSX.readFile(templatePath);
    for (const key of TECH_KEYS) {
        const layout = TECH_LAYOUT[key];
        const ws = wb.Sheets[layout.sheet];
        assert.ok(ws, `${key}: thiếu sheet ${layout.sheet}`);
        assert.equal(ws[`A${layout.totalRowBefore}`]?.v, "TỔNG", `${key}: dòng TỔNG`);
        assert.equal(ws[`C${layout.totalRowBefore}`]?.f, "COUNTA(C4)", `${key}: công thức TỔNG`);
        assert.equal(ws[`A${layout.firstDataRow - 1}`]?.v, "STT", `${key}: dòng tiêu đề bảng`);
        const lastHeader = ws[`${layout.lastColumn}${layout.firstDataRow - 1}`]?.v;
        assert.ok(typeof lastHeader === "string" && lastHeader.length > 0, `${key}: cột cuối ${layout.lastColumn} phải có tiêu đề cột`);
        assert.equal(ws[`${String.fromCharCode(layout.lastColumn.charCodeAt(0) + 1)}${layout.firstDataRow - 1}`]?.v, undefined, `${key}: sau cột cuối không còn cột nào`);
        assert.match(String(ws["A2"]?.v), /^Nhân viên báo cáo: /, `${key}: A2`);
        assert.ok(layout.deleteSheets?.length === 3 && !layout.deleteSheets.includes(layout.sheet), `${key}: xoá đúng 3 sheet khác`);
        for (const name of layout.deleteSheets ?? []) assert.ok(wb.Sheets[name], `${key}: sheet cần xoá ${name} không có trong mẫu`);
    }
    assert.equal(wb.Sheets["ĐẦU BUỔI"]["J2"].f, "TODAY()");
    assert.equal(wb.Sheets["CUỐI BUỔI"]["J2"].f, "TODAY()");
    assert.equal(wb.Sheets["ĐẦU CA"]["K2"].f, "TODAY()");
    assert.equal(wb.Sheets["CUỐI CA"]["U2"].f, "TODAY()");
});

test("tên file xuất lấy từ ô A1 của từng sheet", { skip }, () => {
    assert.deepEqual(TECH_KEYS.map((k) => readTemplateTitle(templatePath, TECH_LAYOUT[k].sheet)), [
        "ĐIỂM DANH ĐẦU BUỔI",
        "ĐIỂM DANH CUỐI BUỔI",
        "CÔNG VIỆC ĐẦU CA LÀM",
        "CÔNG VIỆC CUỐI CA LÀM",
    ]);
});

test("buildFillPsSpec đưa copyFirstRowFormat cho script Excel, các mẫu khác thì không có khoá này", async () => {
    const { buildFillPsSpec } = await import("../src/lesson/excelFill.js");
    const { CLEANING_LAYOUT } = await import("../src/lesson/cleaningRows.js");
    const base = { name: "x", templatesSrc: "t", outDir: "o", outName: "n.xlsx", rows: [], headerCells: [] };
    const tech = (buildFillPsSpec({ ...base, layout: TECH_LAYOUT.shiftEnd }) as { files: Array<Record<string, unknown>> }).files[0];
    const other = (buildFillPsSpec({ ...base, layout: CLEANING_LAYOUT }) as { files: Array<Record<string, unknown>> }).files[0];
    assert.equal(tech.copyFirstRowFormat, true);
    assert.equal("copyFirstRowFormat" in other, false);
});
