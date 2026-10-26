import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveAppPaths } from "../src/core/paths.js";

const code = path.join("C:", "Program Files", "App");

test("không đặt home: mọi đường dẫn y như công thức cũ (gốc dự án)", () => {
    const p = resolveAppPaths(code, undefined);
    assert.equal(p.home, code);
    assert.equal(p.srcDir, path.join(code, "src"));
    assert.equal(p.outputDir, path.join(code, "output"));
    assert.equal(p.scriptsDir, path.join(code, "scripts"));
    assert.equal(p.templatesDir, path.resolve(code, "..", "templates"));
    assert.equal(p.chatRulesPath, path.join(code, "chat-rules.json"));
    assert.equal(p.photoRulesDir, path.join(code, "photo-rules"));
});

test("đặt home: đầu ra, luật chat và mẫu nằm dưới home, mã và tài nguyên vẫn dưới codeRoot", () => {
    const home = path.join("C:", "Users", "A B", "AppData", "Local", "Zbot");
    const p = resolveAppPaths(code, home);
    assert.equal(p.outputDir, path.join(home, "output"));
    assert.equal(p.chatRulesPath, path.join(home, "chat-rules.json"));
    assert.equal(p.templatesDir, path.join(home, "templates"));
    assert.equal(p.scriptsDir, path.join(code, "scripts"));
    assert.equal(p.photoRulesDir, path.join(code, "photo-rules"));
    assert.equal(p.srcDir, path.join(code, "src"));
    assert.equal(p.distDir, path.join(code, "dist"));
});

test("chỉ src/core/paths.ts dùng import.meta.url", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const hits: string[] = [];
    const walk = (dir: string): void => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) walk(full);
            else if (e.name.endsWith(".ts") && fs.readFileSync(full, "utf8").includes("import.meta.url")) hits.push(path.relative(root, full).replaceAll("\\", "/"));
        }
    };
    walk(path.join(root, "src"));
    for (const f of ["config.ts"]) if (fs.readFileSync(path.join(root, f), "utf8").includes("import.meta.url")) hits.push(f);
    assert.deepEqual(hits, ["src/core/paths.ts"]);
});
