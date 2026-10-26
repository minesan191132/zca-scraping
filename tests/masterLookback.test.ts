import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { LOOKBACK_DAYS, recentDays } from "../src/master/lookback.js";

test("recentDays: n ngày kết thúc ở hôm nay, cũ nhất trước", () => {
    assert.deepEqual(recentDays("2026-10-09", 3), ["2026-10-07", "2026-10-08", "2026-10-09"]);
    assert.deepEqual(recentDays("2026-10-01", 2), ["2026-09-30", "2026-10-01"]);
});
test("cửa sổ mặc định là 7 ngày", () => {
    assert.equal(LOOKBACK_DAYS, 7);
    assert.equal(recentDays("2026-10-09", LOOKBACK_DAYS).length, 7);
});
