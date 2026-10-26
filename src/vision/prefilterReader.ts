import { scanBundleImages, type ScannedImage } from "./imageScan.js";
import type { OcrEngine } from "../ocr/ocrEngine.js";
import type { BundleReading, ReadInput, ReadResult, VisionReader } from "../types/index.js";

export interface PrefilterOptions {
    /** Bộ đọc thật (agent) được bọc. */
    inner: VisionReader;
    createOcr: () => OcrEngine;
    /** Bộ có ít ảnh hơn mức này thì không lọc: gọi thẳng agent (lọc không tiết kiệm được gì). */
    minImages: number;
    concurrency: number;
    /** Tiêu đề gây nghi của bộ (xem `suspectTitle`), hoặc null; thiếu hàm này thì không bỏ bộ nào theo tiêu đề. */
    suspectTitle?: (manifest: ReadInput["manifest"]) => string | null;
    log?: (message: string) => void;
}

/**
 * Bọc một `VisionReader` bằng bộ lọc OCR. Mỗi ảnh được OCR rồi xếp loại; chỉ ảnh thuộc loại có luật đang bật (id luật nằm trong `input.rules`) và ảnh
 * `khong_chac` được gửi cho agent, ảnh còn lại bị bỏ và ghi `{ seq, loai: "khac" }` vào kết quả. Không giữ được ảnh nào thì gửi CẢ bộ. Agent nhận một
 * manifest con vẫn giữ `seq` gốc, nên các bước sau (review, ghép với tin chữ, tốc độ theo thứ tự phòng) không đổi. OCR lỗi chỉ làm ảnh thành "không chắc"
 * (được giữ). Lần đọc thứ hai dùng cache `ocr.json` nên cùng tập ảnh con và không OCR lại.
 */
export function makePrefilterReader(opts: PrefilterOptions): VisionReader {
    const log = opts.log ?? (() => undefined);
    return {
        async readBundle(input: ReadInput): Promise<ReadResult> {
            const { manifest, bundleDir, rules } = input;
            // Bộ kèm tin điểm danh/đầu ca: luôn OCR (dù ít ảnh) và bỏ cả bộ nếu không thấy ảnh nào cần đọc. Đọc tay (`force`) thì như bộ thường.
            const suspect = input.force || !opts.suspectTitle ? null : opts.suspectTitle(manifest);
            if (manifest.images.length < opts.minImages && suspect === null) return opts.inner.readBundle(input);

            const scanned = await scanBundleImages(bundleDir, manifest, opts.createOcr, opts.concurrency);
            const enabled = new Set(rules.map((r) => r.id));
            const keep = (s: ScannedImage): boolean => s.cls === "khong_chac" || enabled.has(s.cls);
            let kept = scanned.filter(keep);
            let dropped = scanned.filter((s) => !keep(s));

            const failed = scanned.filter((s) => s.error);
            if (failed.length > 0) log(`OCR không đọc được ${failed.length}/${scanned.length} ảnh (giữ lại để agent đọc): ${failed[0].error}`);

            if (kept.length === 0 && suspect !== null) {
                log(`OCR ${manifest.bundleId}: bỏ cả bộ ${scanned.length} ảnh (tin kèm "${suspect}", OCR không thấy ảnh nghỉ phép hay biên bản nào), không gọi agent`);
                return {
                    ok: true,
                    reading: {
                        bundleId: manifest.bundleId,
                        readAt: Date.now(),
                        reader: { kind: "openrouter", model: "ocr-prefilter", promptVersion: "-", ruleVersions: {} },
                        images: manifest.images.map((img) => ({ seq: img.seq, loai: "khac", doTinCay: "cao" as const })),
                        extracted: {},
                        prefilter: { fallback: false, kept: [], dropped: scanned.map((s) => ({ seq: s.seq, loai: s.cls, chars: s.chars })), skipped: suspect },
                    },
                };
            }
            const fallback = kept.length === 0;
            if (fallback) {
                kept = scanned;
                dropped = [];
            }
            const count = (cls: string): number => scanned.filter((s) => s.cls === cls).length;
            log(`OCR ${manifest.bundleId}: giữ ${kept.length}/${scanned.length} ảnh (nghỉ phép ${count("leave")}, tốc độ ${count("speedtest")}, biên bản ${count("bienban")}, không chắc ${count("khong_chac")})${fallback ? "; không có ảnh nào cần đọc nên gửi cả bộ" : ""}`);

            const annotate = (reading: BundleReading): BundleReading => ({
                ...reading,
                prefilter: { fallback, kept: kept.map((s) => ({ seq: s.seq, loai: s.cls })), dropped: dropped.map((s) => ({ seq: s.seq, loai: s.cls, chars: s.chars })) },
            });

            if (dropped.length === 0) {
                const whole = await opts.inner.readBundle(input);
                return whole.ok ? { ok: true, reading: annotate(whole.reading) } : whole;
            }

            const keptSeqs = new Set(kept.map((s) => s.seq));
            const sub = await opts.inner.readBundle({ ...input, manifest: { ...manifest, images: manifest.images.filter((img) => keptSeqs.has(img.seq)) } });
            if (!sub.ok) return sub;
            const fromAgent = new Map(sub.reading.images.map((i) => [i.seq, i]));
            const images = manifest.images.map((img) => fromAgent.get(img.seq) ?? { seq: img.seq, loai: "khac", doTinCay: "cao" as const });
            return { ok: true, reading: annotate({ ...sub.reading, images }) };
        },
    };
}
