import path from "node:path";
import { config } from "../../config.js";
import { photoReportsDir } from "../core/paths.js";
import { createTesseractEngine } from "../ocr/ocrEngine.js";
import { listBundleDirs, readManifest } from "../vision/bundleStore.js";
import { scanBundleImages } from "../vision/imageScan.js";

/**
 * In chữ OCR, kích thước, loại và điểm của từng ảnh trong một bộ (để kiểm tra bộ lọc và chỉnh tín hiệu khi có ảnh lạ). Không gọi agent, không tốn tiền.
 * Kết quả OCR được lưu vào `ocr.json` trong thư mục bộ như khi bot chạy.
 *
 *   npm run photos:ocr -- --bundle <mã bộ> [--day YYYY-MM-DD]
 */
function option(name: string): string | undefined {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
    const bundleId = option("--bundle");
    if (!bundleId) throw new Error("Thiếu --bundle <mã bộ> (xem npm run photos:review -- --list).");
    const root = photoReportsDir(config.dataDir);
    const dir = listBundleDirs(root, option("--day")).find((d) => readManifest(d)?.bundleId === bundleId);
    const manifest = dir ? readManifest(dir) : null;
    if (!dir || !manifest) throw new Error(`Không tìm thấy bộ ${bundleId}${option("--day") ? ` ngày ${option("--day")}` : ""}.`);

    const pre = config.vision.prefilter;
    const scanned = await scanBundleImages(dir, manifest, () => createTesseractEngine({ cachePath: path.join(config.dataDir, ".ocr"), concurrency: pre.concurrency }), pre.concurrency);
    console.log(`[photos:ocr] bộ ${bundleId}: ${scanned.length} ảnh`);
    for (const s of scanned) {
        const size = s.width && s.height ? `${s.width}x${s.height}` : "?";
        const scores = `nghỉ phép ${s.scores.leave}, tốc độ ${s.scores.speedtest}, biên bản ${s.scores.bienban}`;
        console.log(`  ảnh ${String(s.seq).padStart(2)} ${size.padEnd(9)} chữ=${String(s.chars).padStart(4)}  ${s.cls.padEnd(10)} (${scores})${s.error ? `  LỖI: ${s.error}` : ""}`);
    }
}

main().catch((err) => {
    console.error((err as Error).message);
    process.exitCode = 1;
});
