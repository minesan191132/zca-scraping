import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dayBuiltPath, dayNeedsRebuild, readDayBuilt, rowsSignature, writeDayBuilt } from "../src/lesson/dayReportState.js";

const built = { day: "2026-10-20", signature: "abc", file: "QUẢN LÝ BIÊN BẢN_261020_T3_1028.xlsx" };

test("rebuild only when never built, another day, other content, or the file is gone", () => {
    const exists = () => true;
    assert.equal(dayNeedsRebuild(null, "2026-10-20", "abc", exists), true);
    assert.equal(dayNeedsRebuild(built, "2026-10-20", "abc", exists), false, "same day and same rows: keep the file (and its time in the name)");
    assert.equal(dayNeedsRebuild(built, "2026-10-21", "abc", exists), true);
    assert.equal(dayNeedsRebuild(built, "2026-10-20", "xyz", exists), true);
    assert.equal(dayNeedsRebuild(built, "2026-10-20", "abc", () => false), true, "a deleted file is made again");
});

test("the signature follows the rows: same rows give the same signature, any cell or row change gives another, no rows has its own", () => {
    const rows = [{ A: 1, B: "'20/10/2026", C: "TH LƯƠNG THẾ VINH", G: 1 }];
    assert.equal(rowsSignature(rows), rowsSignature(JSON.parse(JSON.stringify(rows))));
    assert.notEqual(rowsSignature(rows), rowsSignature([{ ...rows[0], G: 2 }]));
    assert.notEqual(rowsSignature(rows), rowsSignature([...rows, { A: 2 }]));
    assert.notEqual(rowsSignature(rows), rowsSignature([]));
    assert.equal(rowsSignature([]), rowsSignature([]));
});

test("the state round-trips through a file, and a missing or broken file reads as null", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "day-state-"));
    const file = path.join(dir, "state.json");
    assert.equal(readDayBuilt(file), null);
    writeDayBuilt(built, file);
    assert.deepEqual(readDayBuilt(file), built);
    fs.writeFileSync(file, "không phải json", "utf8");
    assert.equal(readDayBuilt(file), null);
    fs.writeFileSync(file, JSON.stringify({ day: "x" }), "utf8");
    assert.equal(readDayBuilt(file), null);
});

test("each report of each set has its own state file", () => {
    assert.ok(dayBuiltPath("minutes", "NguoiB").endsWith(".minutes-report.NguoiB.json"));
    assert.ok(dayBuiltPath("cleaning", "NguoiA").endsWith(".cleaning-report.NguoiA.json"));
    assert.notEqual(dayBuiltPath("minutes", "A"), dayBuiltPath("minutes", "B"));
    assert.notEqual(dayBuiltPath("minutes", "A"), dayBuiltPath("attendance", "A"));
});
