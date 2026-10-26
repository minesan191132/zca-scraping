import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createTesseractEngine } from "../src/ocr/ocrEngine.js";

const DATA = path.resolve("data/.ocr");
const haveData = fs.existsSync(path.join(DATA, "vie.traineddata")) && fs.existsSync(path.join(DATA, "eng.traineddata"));

test("the real engine rejects on a file that is not an image instead of crashing the process", { skip: !haveData && "dữ liệu OCR chưa tải vào data/.ocr" }, async () => {
    const bad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ocr-bad-")), "bad.jpg");
    fs.writeFileSync(bad, "khong phai anh");
    const engine = createTesseractEngine({ cachePath: DATA, concurrency: 1 });
    try {
        await assert.rejects(engine.recognize(bad));
    } finally {
        await engine.close();
    }
});

test("when a later worker fails to start, the workers already started are terminated", async () => {
    const terminated: number[] = [];
    let made = 0;
    const createWorker = (async () => {
        const n = ++made;
        if (n === 2) throw new Error("không tải được dữ liệu ngôn ngữ");
        return { terminate: async () => void terminated.push(n) };
    }) as never;
    const createScheduler = (() => ({ addWorker: () => undefined, addJob: async () => ({ data: { text: "" } }), terminate: async () => undefined })) as never;
    const engine = createTesseractEngine({ cachePath: fs.mkdtempSync(path.join(os.tmpdir(), "ocr-cache-")), concurrency: 2 }, { createWorker, createScheduler });
    await assert.rejects(engine.recognize("x.jpg"), /dữ liệu ngôn ngữ/);
    assert.deepEqual(terminated, [1]);
    await engine.close();
});
