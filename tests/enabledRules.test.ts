import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterRulesByReports } from "../src/vision/enabledRules.js";
import { loadRules } from "../src/vision/rules.js";

const rules = loadRules();
const ids = (reports: string[]): string[] => filterRulesByReports(rules, reports).map((r) => r.id);

test("a photo rule is read only when a report that needs it is enabled", () => {
    assert.deepEqual(ids(["leave", "maintenance", "internetSpeed"]), ["leave"], "minutes off: the bienban rule is dropped; internetSpeed reads text only, no photo rule");
    assert.deepEqual(ids(["leave", "internetSpeed", "minutes"]), ["bienban", "leave"]);
    assert.deepEqual(ids(["leave"]), ["leave"]);
    assert.deepEqual(ids([]), [], "nothing enabled keeps no mapped rule (enabledRules then falls back to all)");
});
