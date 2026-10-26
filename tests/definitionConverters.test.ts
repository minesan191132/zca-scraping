import { test } from "node:test";
import assert from "node:assert/strict";
import { convert } from "../src/definitions/converters.js";
import { parseSpeedText } from "../src/lesson/internetSpeedReport.js";
import { itLevelValue } from "../src/lesson/spelling.js";

const c = { ts: Date.UTC(2026, 9, 22, 8 - 7, 15) };

test("numberOrText: số, số kèm đơn vị, chữ, rỗng", () => {
    assert.equal(convert("numberOrText", "51 máy", c), 51);
    assert.equal(convert("numberOrText", "0", c), 0);
    assert.equal(convert("numberOrText", "", c), null);
    assert.equal(convert("numberOrText", "tốt", c), "tốt");
});

test("bulletList và bulletListSkipNone", () => {
    assert.equal(convert("bulletListSkipNone", "Văn Long, Minh Tuấn", c), "- Văn Long\n- Minh Tuấn");
    assert.equal(convert("bulletListSkipNone", "0", c), null);
    assert.equal(convert("bulletList", "1 Media tốt, 1 sumikura yếu", c), "- 1 Media tốt\n- 1 sumikura yếu");
});

test("roomNumbers và leadingNumber", () => {
    assert.equal(convert("roomNumbers", "PM2", c), 2);
    assert.equal(convert("roomNumbers", "PM2, PM3, PM4", c), "2, 3, 4");
    assert.equal(convert("leadingNumber", "1 hoạt động", c), 1);
});

test("clock và clockOrSentTime", () => {
    assert.equal(convert("clock", "9g30", c), 570 / 1440);
    assert.equal(convert("clock", "", c), null);
    assert.equal(convert("clockOrSentTime", "", c), (8 * 60 + 15) / 1440);
    assert.equal(convert("clockOrSentTime", "9:00", c), 540 / 1440);
});

test("speedMbps và itLevel", () => {
    assert.equal(convert("speedMbps", undefined, c), null);
    assert.equal(convert("speedMbps", "90 mbps", c), parseSpeedText("90 mbps"));
    assert.equal(convert("itLevel", "l", c), itLevelValue("l"));
});
