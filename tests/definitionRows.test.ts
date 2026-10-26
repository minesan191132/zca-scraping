import { test } from "node:test";
import assert from "node:assert/strict";
import { rowsInWindow } from "../src/definitions/engine.js";
import { buildFillParts } from "../src/definitions/fillParts.js";
import type { ReportDefinition } from "../src/definitions/types.js";
import type { SourceMessage } from "../src/types/index.js";

const def: ReportDefinition = {
    code: "thu",
    label: "THỬ",
    titles: [],
    titleScope: "attendanceStart",
    labelScope: "attendance",
    requiredLabels: ["ten truong"],
    sttColumn: "A",
    columns: [{ column: "C", labels: ["ten truong"], convert: "text" }],
    window: { cutoff: "08:30" },
    template: { file: "x.xlsx", sheet: "ĐẦU BUỔI", firstDataRow: 4, totalRowBefore: 8, lastColumn: "J", deleteSheets: ["CUỐI BUỔI"], copyFirstRowFormat: true },
    header: { dateCell: "J2", reporterCell: "A2", reporterPrefix: "Nhân viên báo cáo: " },
    total: { column: "C" },
};

const vn = (hour: number, minute: number, day = 22): number => Date.UTC(2026, 9, day, hour - 7, minute);
const body = (school: string) => `ĐIỂM DANH ĐẦU BUỔI\n- Tên Trường: ${school}`;
const msg = (content: string, ts: number, msgId = String(ts)): SourceMessage => ({ msgId, groupId: "g", groupName: "G", senderId: "s", ts, msgType: "desktop.text", content });
const DAY = "2026-10-22";

test("tin lúc 08:30 còn, 08:31 và ngày khác bị bỏ", () => {
    const { rows, review } = rowsInWindow(def, [msg(body("A"), vn(8, 30)), msg(body("B"), vn(8, 31)), msg(body("C"), vn(8, 0, 21))], DAY);
    assert.deepEqual(rows, [{ A: 1, C: "A" }]);
    assert.deepEqual(review, []);
});

test("xếp theo giờ gửi rồi mã tin, STT từ 1", () => {
    const { rows } = rowsInWindow(def, [msg(body("Sau"), vn(8, 10), "b"), msg(body("Trước"), vn(7, 50), "z"), msg(body("Sau2"), vn(8, 10), "a")], DAY);
    assert.deepEqual(rows.map((r) => [r.A, r.C]), [[1, "Trước"], [2, "Sau2"], [3, "Sau"]]);
});

test("tin thiếu Tên Trường thành đúng một mục cần xem, không thành dòng", () => {
    const m = msg("ĐIỂM DANH ĐẦU BUỔI\n- Cấp: I", vn(8, 0), "x1");
    const { rows, review } = rowsInWindow(def, [m, msg(body("A"), vn(8, 5))], DAY);
    assert.equal(rows.length, 1);
    assert.deepEqual(review, [{ code: "thu", msgId: "x1", ts: vn(8, 0), reason: "thieu-nhan", missing: ["ten truong"] }]);
});

test("tin thiếu nhãn gửi sau mốc giờ không vào mục cần xem", () => {
    const { review } = rowsInWindow(def, [msg("ĐIỂM DANH ĐẦU BUỔI\n- Cấp: I", vn(9, 0))], DAY);
    assert.deepEqual(review, []);
});

test("không có tin: rỗng, và buildFillParts ra bảng trắng một dòng", () => {
    const { rows } = rowsInWindow(def, [], DAY);
    assert.deepEqual(rows, []);
    const parts = buildFillParts(def, rows, DAY);
    assert.deepEqual(parts.rows, [{ A: null }]);
    assert.deepEqual(parts.formulaCells, [{ ref: "C5", formula: "COUNTA(C4:C4)" }]);
});

test("công thức theo số dòng", () => {
    const rows = [{ A: 1, C: "a" }, { A: 2, C: "b" }, { A: 3, C: "c" }];
    assert.deepEqual(buildFillParts(def, rows, DAY).formulaCells, [{ ref: "C7", formula: "COUNTA(C4:C6)" }]);
});

test("ô tiêu đề: ngày luôn có, tên người báo cáo chỉ khi truyền vào", () => {
    const without = buildFillParts(def, [], DAY);
    assert.deepEqual(without.headerCells.map((c) => c.ref), ["J2"]);
    assert.equal(without.headerCells[0].numberFormat, "dd/mm/yyyy");
    const withName = buildFillParts(def, [], DAY, "Nguyễn Thu Hà");
    assert.deepEqual(withName.headerCells[1], { ref: "A2", value: "Nhân viên báo cáo: Nguyễn Thu Hà" });
});

test("layout lấy deleteSheets và copyFirstRowFormat từ mẫu", () => {
    assert.deepEqual(buildFillParts(def, [], DAY).layout, {
        templateFile: "x.xlsx", sheet: "ĐẦU BUỔI", firstDataRow: 4, totalRowBefore: 8, lastColumn: "J", copyFirstRowFormat: true, deleteSheets: ["CUỐI BUỔI"],
    });
});
