import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config } from "../config.js";
import { BUILTIN_DEFINITIONS } from "../src/definitions/builtin/index.js";
import { customDefinitionsDir, loadDefinitions, withConfigCutoffs } from "../src/definitions/loader.js";
import type { ReportDefinition } from "../src/definitions/types.js";

/** Một định nghĩa của khách hợp lệ, mã `code`. */
const custom = (code: string, label = code): ReportDefinition => ({
    code,
    label,
    titles: ["BÁO CÁO THỬ"],
    requiredLabels: ["ten truong"],
    sttColumn: "A",
    columns: [{ column: "B", labels: ["ten truong"], convert: "text" }],
    window: { cutoff: "10:00" },
    template: { file: "thu.xlsx", sheet: "THỬ", firstDataRow: 4, totalRowBefore: 8, lastColumn: "B" },
    header: { dateCell: "B2" },
    total: { column: "B" },
});

function tempDir(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "defs-"));
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text, "utf8");
    return dir;
}

const codes = (defs: ReportDefinition[]): string[] => defs.map((d) => d.code);
const BUILTIN_CODES = codes(BUILTIN_DEFINITIONS);

test("customDir null hoặc không tồn tại: không lỗi, đủ bốn định nghĩa dựng sẵn", () => {
    for (const dir of [null, path.join(os.tmpdir(), "khong-co-thu-muc-nay-123456")]) {
        const r = loadDefinitions(dir);
        assert.deepEqual(codes(r.defs), BUILTIN_CODES);
        assert.deepEqual(r.problems, []);
    }
});

test("file JSON lỗi cú pháp không làm file khác ngừng nạp; file có BOM vẫn đọc được", () => {
    const dir = tempDir({
        "a-hong.json": "{ khong phai json",
        "b-bom.json": `﻿${JSON.stringify(custom("baoCaoBom"))}`,
        "c-tot.json": JSON.stringify(custom("baoCaoTot")),
        "ghi-chu.txt": "không phải json",
    });
    const r = loadDefinitions(dir);
    assert.deepEqual(codes(r.defs), [...BUILTIN_CODES, "baoCaoBom", "baoCaoTot"]);
    assert.equal(r.problems.length, 1);
    assert.match(r.problems[0]!, /a-hong\.json/);
});

test("định nghĩa không hợp lệ vào problems, nêu tên file và trường sai", () => {
    const bad = { ...custom("baoCaoSai"), columns: [{ column: "B", labels: ["x"], convert: "khongCo" }] };
    const r = loadDefinitions(tempDir({ "sai.json": JSON.stringify(bad) }));
    assert.deepEqual(codes(r.defs), BUILTIN_CODES);
    assert.equal(r.problems.length, 1);
    assert.match(r.problems[0]!, /sai\.json/);
    assert.match(r.problems[0]!, /convert/);
});

test("mã trùng bản dựng sẵn: bản dựng sẵn thắng và có cảnh báo; trùng giữa hai file của khách: file đầu theo tên thắng", () => {
    const dir = tempDir({
        "1-shift.json": JSON.stringify(custom("shiftEnd", "GIẢ")),
        "2-a.json": JSON.stringify(custom("baoCaoX", "BẢN ĐẦU")),
        "3-b.json": JSON.stringify(custom("baoCaoX", "BẢN SAU")),
    });
    const r = loadDefinitions(dir);
    assert.deepEqual(codes(r.defs), [...BUILTIN_CODES, "baoCaoX"]);
    assert.equal(r.defs.find((d) => d.code === "shiftEnd"), BUILTIN_DEFINITIONS.find((d) => d.code === "shiftEnd"));
    assert.equal(r.defs.find((d) => d.code === "baoCaoX")?.label, "BẢN ĐẦU");
    assert.equal(r.problems.length, 2);
    assert.match(r.problems[0]!, /1-shift\.json.*shiftEnd/);
    assert.match(r.problems[1]!, /3-b\.json.*baoCaoX/);
});

test("withConfigCutoffs đổi mốc của đúng bốn mã kỹ thuật theo config.techReports, mã khác giữ nguyên, không sửa bản gốc", () => {
    const shifted = BUILTIN_DEFINITIONS.map((d) => ({ ...d, window: { cutoff: "23:59" } }));
    const out = withConfigCutoffs([...shifted, custom("baoCaoKhac")]);
    const cutoff = (code: string) => out.find((d) => d.code === code)?.window.cutoff;
    assert.equal(cutoff("attendanceStart"), config.techReports.attendanceStartUntil);
    assert.equal(cutoff("attendanceEnd"), config.techReports.attendanceEndUntil);
    assert.equal(cutoff("shiftStart"), config.techReports.shiftStartUntil);
    assert.equal(cutoff("shiftEnd"), config.techReports.shiftEndUntil);
    assert.equal(cutoff("baoCaoKhac"), "10:00");
    assert.ok(shifted.every((d) => d.window.cutoff === "23:59"));
});

test("customDefinitionsDir nằm trong config.dataDir", () => {
    assert.equal(customDefinitionsDir(), path.join(config.dataDir, "definitions"));
});
