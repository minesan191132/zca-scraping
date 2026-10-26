import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrintedDate } from "../src/leave/dates.js";

test("a printed date becomes YYYY-MM-DD using the configured order", () => {
    assert.equal(parsePrintedDate("10/05/2026", "MDY"), "2026-10-05");
    assert.equal(parsePrintedDate("10/05/2026", "DMY"), "2026-05-10");
    assert.equal(parsePrintedDate("5-10-26", "DMY"), "2026-10-05");
    assert.equal(parsePrintedDate(" 11.09.2026 ", "MDY"), "2026-11-09");
    assert.equal(parsePrintedDate("11 / 09 / 2026", "MDY"), "2026-11-09");
});

test("when only the other order gives a real date, that order is used", () => {
    assert.equal(parsePrintedDate("25/12/2026", "MDY"), "2026-12-25");
    assert.equal(parsePrintedDate("12/25/2026", "DMY"), "2026-12-25");
});

test("an ISO date passes through unchanged", () => {
    assert.equal(parsePrintedDate("2026-10-05", "MDY"), "2026-10-05");
    assert.equal(parsePrintedDate("2026-10-05", "DMY"), "2026-10-05");
});

test("anything that is not a real date is null", () => {
    for (const v of ["", "abc", "31/02/2026", "13/13/2026", "10/05", "2026-02-30", null, 5, undefined]) assert.equal(parsePrintedDate(v as never, "MDY"), null, String(v));
});
