import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Lõi (scrape, store, core, export, mcp, watch) không được import nghiệp vụ: bản bán gộp lõi mà không có các thư mục này.
const CORE_DIRS = ["scrape", "store", "core", "export", "mcp", "watch"];
const FORBIDDEN = ["lesson", "vision", "chat", "master", "leave", "minutes", "runner", "total", "reportSets"];

function tsFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...tsFiles(full));
        else if (entry.name.endsWith(".ts")) out.push(full);
    }
    return out;
}

test("core folders do not import business folders", () => {
    const root = path.join(process.cwd(), "src");
    const bad: string[] = [];
    const re = new RegExp(String.raw`from\s+["']\.\./(` + FORBIDDEN.join("|") + String.raw`)/`);
    for (const d of CORE_DIRS) {
        const dir = path.join(root, d);
        if (!fs.existsSync(dir)) continue;
        for (const file of tsFiles(dir)) {
            fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
                if (re.test(line)) bad.push(`${path.relative(root, file)}:${i + 1}: ${line.trim()}`);
            });
        }
    }
    assert.deepEqual(bad, []);
});
