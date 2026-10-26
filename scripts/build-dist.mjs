// Gộp các CLI lõi của Beta thành dist/cli/<tên>.js (ESM, node22, minify, không sourcemap).
// Dùng: npm run build:dist. Chỉ gộp file, không chạy bot.
//
// `external`: gói có phần gốc hoặc nhị phân mà esbuild không gộp được. Danh sách này được chốt bằng cách chạy build.
const EXTERNAL = [
    "mssql", // trình điều khiển CSDL: nạp theo yêu cầu, có phần gốc tùy chọn (msnodesqlv8)
    "msnodesqlv8",
    "tesseract.js", // OCR: tải worker và dữ liệu ngôn ngữ từ đĩa lúc chạy
];

import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { containsPrivateKey, dynamicExternalImports, forbiddenEntries, forbiddenInputs, staticExternalImports } from "./distCheck.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist");

const entries = [
    "src/cli/bot-watch-core.ts",
    "src/cli/bot-dispatch.ts",
    "src/cli/bot-scrape.ts",
    "src/cli/export-excel.ts",
    "src/cli/config-dump.ts",
    // watch-status.ts và runner-status.ts không gộp được (một cần lesson/recovery, một cần reportSets, runner/steps): đã có bản gộp
    // riêng của hai lệnh trạng thái; không nới forbiddenInputs để gộp chúng.
    "src/cli/dispatch-status.ts",
    "src/cli/watch-status-core.ts",
    "src/cli/license-info.ts",
];

// Lệnh cấp giấy phép giữ khóa riêng: không bao giờ là điểm vào của gói.
const authorOnly = forbiddenEntries(entries);
if (authorOnly.length > 0) {
    console.error("[build:dist] điểm vào chỉ dành cho tác giả không được có trong gói: " + authorOnly.join(", "));
    process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });

const entryPoints = Object.fromEntries([
    ...entries.map((e) => [path.join("cli", path.basename(e, ".ts")), path.join(root, e)]),
    ["mcp/server", path.join(root, "src/mcp/server.ts")],
]);

const result = await build({
    entryPoints,
    outdir: outDir,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    minify: true,
    sourcemap: false,
    metafile: true,
    external: EXTERNAL,
    // Cờ bản gộp quyết ở lúc dựng (không phụ thuộc biến môi trường của khách): mã trong dist luôn đòi giấy phép.
    define: { "process.env.ZBOT_BUNDLED": JSON.stringify("1") },
    // Các gói CommonJS gộp vào ESM cần `require` thật.
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    logLevel: "warning",
});

const bad = forbiddenInputs(result.metafile);
if (bad.length > 0) {
    console.error(`[build:dist] gói chứa mã nghiệp vụ không được có (${bad.length} file):`);
    for (const p of bad) console.error(`  ${p}`);
    process.exit(1);
}
// Máy khách không có node_modules: gói ngoài chỉ được nạp bằng import() động; và không file ra nào được chứa khóa riêng.
const staticBad = [];
const dynamicUsed = new Set();
const keyBad = [];
for (const out of Object.keys(result.metafile.outputs)) {
    if (!out.endsWith(".js")) continue;
    const text = fs.readFileSync(path.resolve(root, out), "utf8");
    for (const name of staticExternalImports(text, EXTERNAL)) staticBad.push(out + " -> " + name);
    for (const name of dynamicExternalImports(text, EXTERNAL)) dynamicUsed.add(name);
    if (containsPrivateKey(text)) keyBad.push(out);
}
if (staticBad.length > 0) {
    console.error("[build:dist] import tĩnh một gói ngoài (máy khách không có node_modules, file sẽ chết lúc nạp):");
    for (const p of staticBad) console.error("  " + p);
    process.exit(1);
}
if (keyBad.length > 0) {
    console.error("[build:dist] file ra chứa khóa riêng:");
    for (const p of keyBad) console.error("  " + p);
    process.exit(1);
}
if (dynamicUsed.size > 0) console.log("[build:dist] gói ngoài nạp động (cần có ở máy khách nếu đường đó chạy): " + [...dynamicUsed].join(", "));

// Bản cài không có package.json nào phía trên dist/: không có file này Node coi các .js là CommonJS và các CLI chết ngay.
fs.writeFileSync(path.join(outDir, "package.json"), JSON.stringify({ type: "module" }));

console.log(`[build:dist] xong: ${Object.keys(result.metafile.outputs).length} file trong dist/`);
