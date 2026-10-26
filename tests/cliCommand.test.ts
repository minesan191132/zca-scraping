import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { cliCommand } from "../src/runner/steps.js";
import { srcDir, distDir } from "../src/core/paths.js";
// @ts-expect-error file .mjs không có kiểu
import { forbiddenInputs } from "../scripts/distCheck.mjs";

test("cliCommand chạy từ mã nguồn: tsx + src/cli", () => {
    const c = cliCommand("bot-scrape.ts", false);
    assert.equal(c.command, process.execPath);
    assert.deepEqual(c.args, ["--import", "tsx", path.join(srcDir, "cli", "bot-scrape.ts")]);
});

test("cliCommand chạy bản gộp: dist/cli/<tên>.js", () => {
    const c = cliCommand("bot-scrape.ts", true);
    assert.deepEqual(c.args, [path.join(distDir, "cli", "bot-scrape.js")]);
});

test("đường có khoảng trắng vẫn là MỘT phần tử", () => {
    const root = path.join("C:", "Users", "A B", "AppData", "dist");
    const c = cliCommand("bot-scrape.ts", true, root);
    assert.equal(c.args.length, 1);
    assert.equal(c.args[0], path.join(root, "cli", "bot-scrape.js"));
});

test("forbiddenInputs bắt đúng thư mục nghiệp vụ", () => {
    assert.deepEqual(forbiddenInputs({ inputs: { "src/lesson/time.ts": {}, "src/scrape/cdp.ts": {} } }), ["src/lesson/time.ts"]);
    assert.deepEqual(forbiddenInputs({ inputs: {} }), []);
    const win = String.raw`src\chat\x.ts`;
    assert.deepEqual(forbiddenInputs({ inputs: { [win]: {} } }), [win]);
});
