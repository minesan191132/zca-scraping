import fs from "node:fs";
import { createScheduler, createWorker, type Scheduler, type Worker } from "tesseract.js";

/** Đọc chữ trong một file ảnh. Tách thành giao diện để test dùng bản giả (bản thật cần dữ liệu ngôn ngữ và mất vài giây khởi động). */
export interface OcrEngine {
    recognize(file: string): Promise<string>;
    /** Tắt mọi worker; gọi nhiều lần cũng được. Không gọi thì tiến trình có thể không thoát. */
    close(): Promise<void>;
}

export interface TesseractOptions {
    /** Ngôn ngữ, mặc định "vie+eng". */
    langs?: string;
    /** Nơi lưu dữ liệu ngôn ngữ đã tải (tải một lần, cần mạng lần đầu). */
    cachePath: string;
    /** Số worker chạy song song. */
    concurrency: number;
}

/** Chỉ để test thay tesseract.js bằng bản giả. */
export interface TesseractDeps {
    createWorker?: typeof createWorker;
    createScheduler?: typeof createScheduler;
}

/**
 * Bản thật dùng tesseract.js. Khởi động lười ở lần `recognize` đầu tiên; lỗi khởi động làm mọi lần `recognize` sau ném lỗi (người gọi coi ảnh là "không chắc").
 * Quan trọng: tesseract.js, khi một lần đọc hoặc lần nạp dữ liệu thất bại, vừa từ chối promise vừa NÉM một ngoại lệ không bắt được trong bộ nghe sự kiện của worker
 * (làm sập cả bot:runner) trừ khi có `errorHandler`; vì vậy luôn truyền một `errorHandler` rỗng và dựa vào việc promise bị từ chối.
 */
export function createTesseractEngine(opts: TesseractOptions, deps: TesseractDeps = {}): OcrEngine {
    const makeWorker = deps.createWorker ?? createWorker;
    const makeScheduler = deps.createScheduler ?? createScheduler;
    let ready: Promise<Scheduler> | null = null;
    const start = async (): Promise<Scheduler> => {
        fs.mkdirSync(opts.cachePath, { recursive: true });
        const scheduler = makeScheduler();
        const started: Worker[] = [];
        try {
            for (let i = 0; i < Math.max(1, opts.concurrency); i++) {
                const worker = await makeWorker(opts.langs ?? "vie+eng", 1, { cachePath: opts.cachePath, errorHandler: () => undefined });
                started.push(worker);
                scheduler.addWorker(worker);
            }
        } catch (err) {
            // Một worker không khởi động được: tắt các worker đã chạy, nếu không chúng rò rỉ ở mỗi bộ ảnh (scheduler chưa được trả về nên close() không với tới).
            await Promise.all(started.map((w) => w.terminate().catch(() => undefined)));
            throw err;
        }
        return scheduler;
    };
    return {
        async recognize(file: string): Promise<string> {
            ready ??= start();
            const scheduler = await ready;
            const { data } = await scheduler.addJob("recognize", file);
            return data.text;
        },
        async close(): Promise<void> {
            const current = ready;
            ready = null;
            if (!current) return;
            const scheduler = await current.catch(() => null);
            await scheduler?.terminate();
        },
    };
}
