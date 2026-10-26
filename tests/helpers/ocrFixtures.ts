import path from "node:path";
import type { OcrEngine } from "../../src/ocr/ocrEngine.js";

export interface FakeOcr {
    /** Tạo một công cụ giả (mỗi lần gọi đếm một lần). */
    create: () => OcrEngine;
    /** Số lần `create` đã được gọi. */
    created: () => number;
    /** Tên các file đã được `recognize`, theo thứ tự gọi. */
    recognized: () => string[];
}

/** Công cụ OCR giả: trả chữ theo TÊN file; giá trị `Error` làm lần đọc đó ném lỗi; tên không có trong `texts` trả chuỗi rỗng. */
export function fakeOcr(texts: Record<string, string | Error>): FakeOcr {
    let created = 0;
    const recognized: string[] = [];
    return {
        create: () => {
            created++;
            return {
                async recognize(file) {
                    const name = path.basename(file);
                    recognized.push(name);
                    const t = texts[name];
                    if (t instanceof Error) throw t;
                    return t ?? "";
                },
                async close() {},
            };
        },
        created: () => created,
        recognized: () => recognized,
    };
}
