import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveReportSets } from "../src/reportSets/resolve.js";
import { runTotalForSets, runTotalOnce, type TotalDeps } from "../src/total/runTotal.js";
import { slotsOfDay } from "../src/total/slots.js";
import { DAY, at } from "./fixtures.js";
import type { FillTemplateArgs } from "../src/lesson/excelFill.js";

const [morning] = slotsOfDay(DAY, { windowStartHour: 6.5, morningHour: 9, afternoonHour: 15 });
const SEVEN = ["netsupport", "loa", "internet", "mayTinh", "dien", "cleaning", "attendance"];
const NAMES = SEVEN.map((k) => `total-${k}`);
const fakeTitle = (templatePath: string, sheet: string): string => `T:${path.basename(templatePath, ".xlsx")}:${sheet}`;

function setup() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "total-leave-"));
    const calls: FillTemplateArgs[] = [];
    const deps: TotalDeps = {
        loadMessages: async () => [],
        readOverrides: () => [],
        fill: (a) => {
            calls.push(a);
            return "";
        },
        templateTitle: fakeTitle,
        templatesSrc: "C:\\mau",
        outDirFor: () => dir,
        trackerFile: path.join(dir, "tracker.json"),
        removeFile: () => undefined,
    };
    return { calls, deps };
}

// Từ 2026-10-21 `leave` và `minutes` không xuất file `-auto` nữa (MASTER_REPORTS): `bot:runner` đã tự dựng hai file đó mỗi chu trình.
test("a set with the leave code still gets exactly the 7 files: no leave -auto file and expected stays 7", async () => {
    const set = resolveReportSets([{ id: "A", reports: [...SEVEN, "leave"] }]).active[0];
    const { calls, deps } = setup();
    const result = await runTotalOnce({ slot: morning, now: at(9, 7), set }, deps);
    assert.deepEqual(calls.map((c) => c.name), NAMES);
    assert.equal(result.counts.leave, undefined);
    assert.deepEqual(result.failed, []);
    assert.equal(result.files.length, 7);
    const combined = await runTotalForSets({ slot: morning, now: at(9, 7), sets: [set] }, deps);
    assert.equal(combined.expected, 7);
});

test("a set with leave and minutes together (Nhi's four reports plus the seven) still writes only the 7 files", async () => {
    const set = resolveReportSets([{ id: "A", reports: [...SEVEN, "leave", "minutes", "maintenance", "internetSpeed"] }]).active[0];
    const { calls, deps } = setup();
    const result = await runTotalOnce({ slot: morning, now: at(9, 7), set }, deps);
    assert.deepEqual(calls.map((c) => c.name), NAMES);
    assert.equal(result.counts.minutes, undefined);
    assert.deepEqual(result.warnings, []);
});

test("a set made only of leave and minutes writes no -auto file and expects none", async () => {
    const set = resolveReportSets([{ id: "N", reports: ["leave", "minutes"] }]).active[0];
    const { calls, deps } = setup();
    const result = await runTotalForSets({ slot: morning, now: at(9, 7), sets: [set] }, deps);
    assert.equal(calls.length, 0);
    assert.equal(result.expected, 0);
    assert.deepEqual(result.failed, []);
});
