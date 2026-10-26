import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error: .mjs không có kiểu
import { containsPrivateKey, forbiddenEntries, staticExternalImports, dynamicExternalImports } from "../scripts/distCheck.mjs";

const root = path.resolve(import.meta.dirname, "..");
const EXT = ["mssql", "msnodesqlv8", "tesseract.js"];

function pems() {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    return { pub: publicKey.export({ type: "spki", format: "pem" }).toString(), priv: privateKey.export({ type: "pkcs8", format: "pem" }).toString() };
}

test("forbiddenEntries trả điểm vào cấp giấy phép", () => {
    assert.deepEqual(forbiddenEntries(["bot-scrape", "issue-license"]), ["issue-license"]);
    assert.deepEqual(forbiddenEntries(["src/cli/issue-license.ts", "src/cli/bot-scrape.ts"]), ["src/cli/issue-license.ts"]);
    assert.deepEqual(forbiddenEntries(["bot-scrape"]), []);
});

test("containsPrivateKey bắt PEM riêng, không bắt PEM công khai", () => {
    const k = pems();
    assert.equal(containsPrivateKey(`x\n${k.priv}\ny`), true);
    assert.equal(containsPrivateKey(k.pub), false);
    assert.equal(containsPrivateKey("không có gì"), false);
});

test("staticExternalImports bắt import tĩnh, bỏ qua import() động và chữ thường", () => {
    assert.deepEqual(staticExternalImports('import x from "mssql";let a=1;', EXT), ["mssql"]);
    assert.deepEqual(staticExternalImports('let a=1;import "tesseract.js";', EXT), ["tesseract.js"]);
    assert.deepEqual(staticExternalImports('a();import{default as m}from"msnodesqlv8";b()', EXT), ["msnodesqlv8"]);
    assert.deepEqual(staticExternalImports("const m = await import(\"mssql\");", EXT), []);
    assert.deepEqual(staticExternalImports('const s = "mssql"; log("tesseract.js");', EXT), []);
    assert.deepEqual(staticExternalImports('import fs from "node:fs";', EXT), []);
});

test("dynamicExternalImports liệt kê import() động", () => {
    assert.deepEqual(dynamicExternalImports('const m=await import("mssql");', EXT), ["mssql"]);
    assert.deepEqual(dynamicExternalImports('import x from "mssql";', EXT), []);
});

/** Mọi file git theo dõi hoặc mới tạo chưa bị bỏ qua, để không ai commit nhầm khóa riêng; thêm các file trong dist/ nếu có. */
function files(): string[] {
    const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const tracked = out.split("\0").filter(Boolean).map((f) => path.join(root, f));
    const dist = path.join(root, "dist");
    const extra: string[] = [];
    const walk = (d: string): void => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else extra.push(p);
        }
    };
    if (fs.existsSync(dist)) walk(dist);
    return [...new Set([...tracked, ...extra])];
}

test("không file nào trong kho (hay dist/) chứa khóa riêng", () => {
    const found: string[] = [];
    for (const f of files()) {
        if (!fs.existsSync(f)) continue;
        if (containsPrivateKey(fs.readFileSync(f, "latin1"))) found.push(path.relative(root, f));
    }
    assert.deepEqual(found, []);
});
