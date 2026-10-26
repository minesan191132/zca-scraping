import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyConfigOverrides, readConfigFile } from "../src/config/configFile.js";
import { config } from "../config.js";

const base = (): Record<string, unknown> => ({
    cdpPort: 9222,
    targets: ["x"] as string[],
    zaloExePath: null as string | null,
    vision: { enabled: false, leave: { groups: [] as string[] } },
    get cdpUrl() {
        return "http://127.0.0.1:9222";
    },
});

test("ghi đè khóa số và khóa lồng nhau, mảng được thay", () => {
    const t = base();
    const r = applyConfigOverrides(t, { cdpPort: 9333, targets: ["a", "b"], vision: { enabled: true, leave: { groups: ["g"] } } });
    assert.deepEqual(r.warnings, []);
    assert.equal(t.cdpPort, 9333);
    assert.deepEqual(t.targets, ["a", "b"]);
    assert.deepEqual(t.vision, { enabled: true, leave: { groups: ["g"] } });
});

test("khóa lạ cho cảnh báo nêu đường dẫn khóa", () => {
    const r = applyConfigOverrides(base(), { vision: { nope: 1 } });
    assert.equal(r.warnings.length, 1);
    assert.match(r.warnings[0], /vision\.nope/);
});

test("sai kiểu: cảnh báo và giữ mặc định", () => {
    const t = base();
    const r = applyConfigOverrides(t, { cdpPort: "9222" });
    assert.match(r.warnings[0], /cdpPort/);
    assert.equal(t.cdpPort, 9222);
});

test("getter không bị ghi đè và có cảnh báo", () => {
    const t = base();
    const r = applyConfigOverrides(t, { cdpUrl: "http://x" });
    assert.match(r.warnings[0], /cdpUrl/);
    assert.equal(t.cdpUrl, "http://127.0.0.1:9222");
});

test("object rỗng mặc định là bảng tra: thay nguyên khối (groupAliases)", () => {
    const t = { groupAliases: {} as Record<string, string> };
    const r = applyConfigOverrides(t, { groupAliases: { "bot test": "LC_BìnhMinh_BTAN" } });
    assert.deepEqual(r.warnings, []);
    assert.deepEqual(t.groupAliases, { "bot test": "LC_BìnhMinh_BTAN" });
});

test("mặc định null nhận chữ (đường dẫn dò tự động)", () => {
    const t = base();
    applyConfigOverrides(t, { zaloExePath: "C:\Zalo.exe" });
    assert.equal(t.zaloExePath, "C:\Zalo.exe");
});

test("file thiếu cho {}, file có BOM đọc được, cú pháp lỗi cho ok:false kèm tên file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zbot-cfg-"));
    assert.deepEqual(readConfigFile(path.join(dir, "none.json")), { ok: true, value: {} });
    const bom = path.join(dir, "bom.json");
    fs.writeFileSync(bom, "\uFEFF{\"cdpPort\": 9333}");
    assert.deepEqual(readConfigFile(bom), { ok: true, value: { cdpPort: 9333 } });
    const bad = path.join(dir, "bad.json");
    fs.writeFileSync(bad, "{ not json");
    const r = readConfigFile(bad);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /bad\.json/);
});

test("config.example.json áp dụng lên config thật không cảnh báo", () => {
    const r = readConfigFile(path.join(import.meta.dirname, "..", "config.example.json"));
    assert.equal(r.ok, true);
    if (r.ok) {
        const copy = structuredClone(JSON.parse(JSON.stringify({ ...config }))) as Record<string, unknown>;
        const load = applyConfigOverrides(copy, r.value);
        assert.deepEqual(load.warnings, []);
    }
});

test("dưới node --test, config.json của máy không được đọc: biến NODE_TEST_CONTEXT có mặt", () => {
    assert.notEqual(process.env.NODE_TEST_CONTEXT, undefined);
});
