import fs from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "../core/atomicWrite.js";
import { classifyImage, type ClassifyResult, type ImageClass } from "./imageClassifier.js";
import { imageSizeOf } from "./imageSize.js";
import type { OcrEngine } from "../ocr/ocrEngine.js";
import type { Manifest, ManifestImage } from "../types/index.js";

export const OCR_CACHE_FILE = "ocr.json";
/** Chữ OCR lưu vào cache tối đa bấy nhiêu ký tự (đủ cho tiêu đề và nhãn, giữ file nhỏ). */
const MAX_TEXT = 6000;

export interface ScannedImage {
    seq: number;
    file: string;
    cls: ImageClass;
    scores: ClassifyResult["scores"];
    /** Số ký tự OCR đọc được (0 khi lỗi). */
    chars: number;
    width: number | null;
    height: number | null;
    /** Có khi OCR hoặc việc đọc file lỗi; ảnh đó là `khong_chac`. */
    error?: string;
}

interface CacheEntry {
    size: number;
    text: string;
    width: number | null;
    height: number | null;
}
interface CacheFile {
    version: 1;
    images: Record<string, CacheEntry>;
}

const isEntry = (v: unknown): v is CacheEntry => {
    const r = v as Record<string, unknown> | null;
    return typeof r === "object" && r !== null && typeof r.size === "number" && typeof r.text === "string";
};

/** File thiếu, hỏng hoặc sai dạng đều đọc ra cache rỗng (chỉ khiến lần quét sau OCR lại). */
function readCache(dir: string): CacheFile {
    try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, OCR_CACHE_FILE), "utf8")) as { images?: Record<string, unknown> };
        const images: Record<string, CacheEntry> = {};
        for (const [name, entry] of Object.entries(raw.images ?? {})) if (isEntry(entry)) images[name] = { size: entry.size, text: entry.text, width: entry.width ?? null, height: entry.height ?? null };
        return { version: 1, images };
    } catch {
        return { version: 1, images: {} };
    }
}

/** Chạy `job` cho từng phần tử, tối đa `limit` việc cùng lúc. */
async function mapLimit<T>(items: T[], limit: number, job: (item: T) => Promise<void>): Promise<void> {
    let next = 0;
    const worker = async (): Promise<void> => {
        while (next < items.length) await job(items[next++]);
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
}

const NO_SCORES: ClassifyResult["scores"] = { leave: 0, speedtest: 0, bienban: 0 };

/**
 * Đọc chữ OCR của mọi ảnh trong bộ rồi phân loại từng ảnh. Kết quả OCR lưu trong `ocr.json` của thư mục bộ, khoá theo tên file và kích thước file: lần quét
 * sau (đọc lại, lần đọc thứ hai, `photos:ocr`) chỉ OCR ảnh mới hoặc đã đổi. Công cụ OCR chỉ được tạo khi có ảnh cần OCR và luôn được tắt khi xong. Ảnh mà OCR
 * hoặc việc đọc file lỗi KHÔNG được ghi vào cache và là `khong_chac` (được giữ): hàm này không ném lỗi vì một ảnh hay vì công cụ không khởi động được.
 */
export async function scanBundleImages(bundleDir: string, manifest: Manifest, createOcr: () => OcrEngine, concurrency: number): Promise<ScannedImage[]> {
    const cache = readCache(bundleDir);
    const entries = new Map<string, CacheEntry>();
    const errors = new Map<string, string>();
    const todo: ManifestImage[] = [];

    for (const img of manifest.images) {
        try {
            const size = fs.statSync(path.join(bundleDir, img.file)).size;
            const hit = cache.images[img.file];
            if (hit && hit.size === size) entries.set(img.file, hit);
            else todo.push(img);
        } catch (err) {
            errors.set(img.file, (err as Error).message);
        }
    }

    if (todo.length > 0) {
        let ocr: OcrEngine | null = null;
        try {
            ocr = createOcr();
            const engine = ocr;
            await mapLimit(todo, concurrency, async (img) => {
                const file = path.join(bundleDir, img.file);
                try {
                    const text = (await engine.recognize(file)).trim().slice(0, MAX_TEXT);
                    const bytes = fs.readFileSync(file);
                    const dims = imageSizeOf(bytes);
                    const entry: CacheEntry = { size: bytes.length, text, width: dims?.width ?? null, height: dims?.height ?? null };
                    entries.set(img.file, entry);
                    cache.images[img.file] = entry;
                } catch (err) {
                    errors.set(img.file, (err as Error).message);
                }
            });
        } catch (err) {
            for (const img of todo) if (!entries.has(img.file)) errors.set(img.file, (err as Error).message);
        } finally {
            await ocr?.close().catch(() => undefined);
        }
        try {
            writeFileAtomic(path.join(bundleDir, OCR_CACHE_FILE), JSON.stringify(cache));
        } catch {
            /* cache chỉ để tiết kiệm; không ghi được thì lần sau OCR lại */
        }
    }

    return manifest.images.map((img): ScannedImage => {
        const entry = entries.get(img.file);
        if (!entry) return { seq: img.seq, file: img.file, cls: "khong_chac", scores: NO_SCORES, chars: 0, width: null, height: null, error: errors.get(img.file) ?? "không có kết quả OCR" };
        const size = entry.width && entry.height ? { width: entry.width, height: entry.height } : null;
        const result = classifyImage(entry.text, size);
        return { seq: img.seq, file: img.file, cls: result.cls, scores: result.scores, chars: entry.text.length, width: entry.width, height: entry.height };
    });
}
