import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLeaveCells } from "../src/leave/cells.js";
import type { ActiveLeave } from "../src/leave/collect.js";
import { parseIso } from "../src/leave/dates.js";
import { normalizeName } from "../src/leave/names.js";

const ROSTER = [
    { row: 4, name: "Trần Minh Đạt" },
    { row: 6, name: "Lê Văn Hùng" },
    { row: 27, name: "Lê Văn Hùng" },
];
const leave = (hoTen: string, tu: string, tuGio: number, den: string, denGio: number): ActiveLeave => ({
    key: normalizeName(hoTen), hoTen, sentTs: 1, bundleId: "b1", rowIndex: 0,
    parsed: { hoTen, tu: parseIso(tu)!, den: parseIso(den)!, tuGio, denGio, soNgay: null, lyDo: null },
});

test("a person with two rows in the file is filled on both rows, in row order, NGÀY as text and BUỔI as given", () => {
    const fill = buildLeaveCells(ROSTER, [leave("le van hung", "2026-10-08", 13.5, "2026-10-10", 18), leave("Trần Minh Đạt", "2026-10-08", 8, "2026-10-08", 11.5)]);
    assert.deepEqual(fill.headerCells, [
        { ref: "F4", value: "08/10/2026", numberFormat: "@" },
        { ref: "E4", value: "Sáng" },
        { ref: "F6", value: "08/10/2026 - 10/10/2026", numberFormat: "@" },
        { ref: "E6", value: "Chiều - Cả ngày" },
        { ref: "F27", value: "08/10/2026 - 10/10/2026", numberFormat: "@" },
        { ref: "E27", value: "Chiều - Cả ngày" },
    ]);
    assert.deepEqual(fill.filled.map((f) => [f.row, f.name]), [[4, "Trần Minh Đạt"], [6, "Lê Văn Hùng"], [27, "Lê Văn Hùng"]]);
    assert.deepEqual(fill.unmatched, []);
});

test("a name that is not in the roster fills nothing and is reported with suggestions", () => {
    const fill = buildLeaveCells(ROSTER, [leave("Lê Hùng", "2026-10-08", 8, "2026-10-08", 18), leave("Người Lạ", "2026-10-09", 8, "2026-10-09", 18)]);
    assert.deepEqual(fill.headerCells, []);
    assert.deepEqual(fill.filled, []);
    assert.deepEqual(fill.unmatched.map((u) => [u.hoTen, u.suggestions]), [["Lê Hùng", ["Lê Văn Hùng"]], ["Người Lạ", []]]);
    assert.equal(fill.unmatched[0].ngay, "08/10/2026");
});

test("no leaves means no cells", () => {
    assert.deepEqual(buildLeaveCells(ROSTER, []), { headerCells: [], filled: [], unmatched: [] });
});
