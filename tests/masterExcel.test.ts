import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import XLSX from "xlsx";
import { applyPatchWithExcel } from "../src/master/applyPatch.js";
import { writeMasterFixture } from "./helpers/masterFixtures.js";

test("Excel thật: chỉ các ô trong bản vá đổi, ô khác giữ nguyên", { skip: process.env.ZCA_EXCEL_TESTS === "1" ? false : "đặt ZCA_EXCEL_TESTS=1 để chạy (cần Excel)" }, () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "xl-")), "07.xlsx");
    writeMasterFixture(file, { "TP HCM": [["TH A", "Q1", null, 46290, null], ["TH B", "Q1", null, 46290, null]] }, { speed: false });
    applyPatchWithExcel(file, [{ sheet: "TP HCM", cell: "H4", value: 46304, note: "x" }]);
    const ws = XLSX.readFile(file).Sheets["TP HCM"];
    assert.equal(ws["H4"].v, 46304);
    assert.equal(ws["H5"].v, 46290);
});
