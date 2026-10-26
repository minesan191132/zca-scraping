import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyByDefinition, missingLabels, parseRowByDefinition, unknownLabels } from "../src/definitions/engine.js";
import type { ReportDefinition } from "../src/definitions/types.js";

const def: ReportDefinition = {
    code: "thu",
    label: "THỬ",
    titles: ["CÔNG VIỆC THỬ"],
    titleScope: "shiftStart",
    labelScope: "shiftStart",
    requiredLabels: ["ten truong"],
    sttColumn: "A",
    continuationLabel: "cong viec thuc hien",
    columns: [
        { column: "C", labels: ["ten truong"], convert: "text" },
        { column: "G", labels: ["bat dau gio lam"], convert: "clock" },
        { column: "J", labels: ["phong may lam viec"], convert: "roomNumbers" },
        { column: "K", labels: ["cong viec thuc hien"], convert: "text" },
    ],
    window: { cutoff: "09:00" },
    template: { file: "x.xlsx", sheet: "S", firstDataRow: 4, totalRowBefore: 8, lastColumn: "K" },
    header: { dateCell: "K2" },
    total: { column: "C" },
};

const FULL = `CÔNG VIỆC ĐẦU CA LÀM
- Tên Trường: TH LƯƠNG THẾ VINH
- Bắt đầu giờ làm: 9:00
- Phòng máy làm việc: PM2
- Công việc thực hiện: Bảo trì`;

test("tin đủ nhãn là match, ô đúng giá trị", () => {
    assert.equal(classifyByDefinition(def, FULL), "match");
    assert.deepEqual(parseRowByDefinition(def, FULL, 0), { C: "TH LƯƠNG THẾ VINH", G: 540 / 1440, J: 2, K: "Bảo trì" });
});

test("thiếu Tên Trường là near, missingLabels nêu nhãn", () => {
    const content = FULL.replace("- Tên Trường: TH LƯƠNG THẾ VINH\n", "");
    assert.equal(classifyByDefinition(def, content), "near");
    assert.deepEqual(missingLabels(def, content), ["ten truong"]);
    assert.equal(parseRowByDefinition(def, content, 0), null);
});

test("dòng Tên Trường để trống cũng là near", () => {
    assert.equal(classifyByDefinition(def, FULL.replace("TH LƯƠNG THẾ VINH", "")), "near");
});

test("tiêu đề lạ là null, tiêu đề tự liệt kê vẫn nhận", () => {
    assert.equal(classifyByDefinition(def, FULL.replace("CÔNG VIỆC ĐẦU CA LÀM", "BÁO CÁO KHÁC")), null);
    assert.equal(classifyByDefinition(def, FULL.replace("CÔNG VIỆC ĐẦU CA LÀM", "Công việc thử")), "match");
});

test("tiêu đề có dấu ngoặc kép bao ngoài vẫn khớp", () => {
    assert.equal(classifyByDefinition(def, `"${FULL}`), "match");
});

test("nhãn lặp lấy dòng cuối, nhãn gõ sai về đúng cột", () => {
    const content = `${FULL}\n- Tên Truog: TH KHÁC`;
    assert.equal(parseRowByDefinition(def, content, 0)?.C, "TH KHÁC");
});

test("continuationLabel nối các dòng sau không có dấu hai chấm", () => {
    const content = `${FULL}\n + thay chuột\n + thay phím`;
    assert.equal(parseRowByDefinition(def, content, 0)?.K, "Bảo trì\nthay chuột\nthay phím");
});

test("nhãn lạ nằm trong unknownLabels", () => {
    assert.deepEqual(unknownLabels(def, `${FULL}\n- Ghi chú thêm: x`), ["ghi chu them"]);
    assert.deepEqual(unknownLabels(def, FULL), []);
});
