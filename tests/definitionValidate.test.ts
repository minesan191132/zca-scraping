import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDefinition } from "../src/definitions/validate.js";

const good = () => ({
    code: "shiftStart",
    label: "CÔNG VIỆC ĐẦU CA LÀM",
    titles: [] as string[],
    titleScope: "shiftStart" as string | undefined,
    labelScope: "shiftStart",
    requiredLabels: ["ten truong"],
    sttColumn: "A",
    columns: [
        { column: "B", labels: ["cap"], convert: "itLevel" },
        { column: "C", labels: ["ten truong"], convert: "text" },
    ],
    window: { cutoff: "09:00" },
    template: { file: "05 - FORM EXCEL BAO CAO KY THUAT.xlsx", sheet: "ĐẦU CA", firstDataRow: 4, totalRowBefore: 8, lastColumn: "C", copyFirstRowFormat: true },
    header: { dateCell: "K2", reporterCell: "A2", reporterPrefix: "Nhân viên báo cáo: " },
    total: { column: "C" },
});

/** Đổi định nghĩa đúng rồi mong lỗi nhắc tên trường `field`. */
function rejects(mutate: (d: ReturnType<typeof good>) => void, field: string): void {
    const d = good();
    mutate(d);
    const r = validateDefinition(d);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.some((e) => e.includes(field)), `lỗi phải nhắc ${field}: ${r.errors.join(" | ")}`);
}

test("định nghĩa đúng thì ok", () => {
    assert.equal(validateDefinition(good()).ok, true);
});

test("mã sai dạng", () => rejects((d) => { d.code = "1-sai"; }, "code"));
test("chữ cột sai dạng", () => rejects((d) => { d.columns[0].column = "b1"; }, "column"));
test("hai cột cùng chữ", () => rejects((d) => { d.columns[1].column = "B"; }, "column"));
test("cột trùng cột STT", () => rejects((d) => { d.columns[0].column = "A"; }, "column"));
test("bộ đổi ngoài danh sách", () => rejects((d) => { d.columns[0].convert = "khongco"; }, "convert"));
test("mốc giờ 25:99", () => rejects((d) => { d.window.cutoff = "25:99"; }, "window.cutoff"));
test("titles rỗng và không có titleScope", () => rejects((d) => { d.titleScope = undefined; }, "titles"));
test("totalRowBefore không lớn hơn firstDataRow", () => rejects((d) => { d.template.totalRowBefore = 4; }, "totalRowBefore"));
test("requiredLabels rỗng", () => rejects((d) => { d.requiredLabels = []; }, "requiredLabels"));

test("đầu vào không phải object", () => {
    for (const bad of [null, "x", 5, []]) {
        const r = validateDefinition(bad);
        assert.equal(r.ok, false);
        if (!r.ok) assert.ok(r.errors[0].includes("object"));
    }
});

test("gom nhiều lỗi một lượt, không ném", () => {
    const d = good();
    d.code = "";
    d.window.cutoff = "99:00";
    const r = validateDefinition(d);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.length >= 2);
});
