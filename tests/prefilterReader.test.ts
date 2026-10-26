import { test } from "node:test";
import assert from "node:assert/strict";
import { makePrefilterReader } from "../src/vision/prefilterReader.js";
import { loadRules } from "../src/vision/rules.js";
import { bundleDirWithImages } from "./helpers/imageFixtures.js";
import { fakeOcr } from "./helpers/ocrFixtures.js";
import { SAMPLE } from "./helpers/ocrSamples.js";
import { manifestOf, T0 } from "./helpers/visionFixtures.js";
import type { ReadInput, ReadResult, VisionReader } from "../src/types/index.js";

const ALL = loadRules();
const NO_MINUTES = ALL.filter((r) => r.id !== "bienban");
const PHOTO: [number, number] = [4000, 3000];

/** Bộ đọc giả: ghi lại các ảnh nó nhận và trả loại "agent" cho mỗi ảnh. */
function fakeInner(result?: ReadResult): { reader: VisionReader; seen: Array<{ seqs: number[]; pass: number }> } {
    const seen: Array<{ seqs: number[]; pass: number }> = [];
    return {
        seen,
        reader: {
            async readBundle(input: ReadInput) {
                seen.push({ seqs: input.manifest.images.map((i) => i.seq), pass: input.pass });
                if (result) return result;
                return {
                    ok: true,
                    reading: {
                        bundleId: input.manifest.bundleId,
                        readAt: T0,
                        reader: { kind: "openrouter", model: "m", promptVersion: "2", ruleVersions: {} },
                        images: input.manifest.images.map((i) => ({ seq: i.seq, loai: "agent", doTinCay: "cao" as const })),
                        extracted: {},
                    },
                };
            },
        },
    };
}

// 6 ảnh: bảng nghỉ phép (1), ảnh phòng máy (2, 3, 4, 6) và ảnh tốc độ (5): không còn luật speedtest nên ảnh 5 bị bỏ, không gửi agent
const sixSizes: Array<[number, number]> = [[1280, 517], PHOTO, PHOTO, PHOTO, [2000, 1500], PHOTO];
const sixTexts = { "01.jpg": SAMPLE.leaveTable, "05.jpg": SAMPLE.speed };

test("only the images that belong to an enabled rule reach the agent, with their original seq, and the reading is merged back in order", async () => {
    const dir = bundleDirWithImages(sixSizes);
    const inner = fakeInner();
    const ocr = fakeOcr(sixTexts);
    const reader = makePrefilterReader({ inner: inner.reader, createOcr: ocr.create, minImages: 3, concurrency: 2 });
    const r = await reader.readBundle({ bundleDir: dir, manifest: manifestOf(6), rules: ALL, pass: 1 });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(inner.seen, [{ seqs: [1], pass: 1 }]);
    assert.deepEqual(r.reading.images.map((i) => [i.seq, i.loai]), [[1, "agent"], [2, "khac"], [3, "khac"], [4, "khac"], [5, "khac"], [6, "khac"]]);
    assert.deepEqual(r.reading.prefilter, {
        fallback: false,
        kept: [{ seq: 1, loai: "leave" }],
        dropped: [{ seq: 2, loai: "khac", chars: 0 }, { seq: 3, loai: "khac", chars: 0 }, { seq: 4, loai: "khac", chars: 0 }, { seq: 5, loai: "speedtest", chars: SAMPLE.speed.trim().length }, { seq: 6, loai: "khac", chars: 0 }],
    });
});

test("the second read uses the same images and does not run OCR again", async () => {
    const dir = bundleDirWithImages(sixSizes);
    const inner = fakeInner();
    const ocr = fakeOcr(sixTexts);
    const reader = makePrefilterReader({ inner: inner.reader, createOcr: ocr.create, minImages: 3, concurrency: 2 });
    await reader.readBundle({ bundleDir: dir, manifest: manifestOf(6), rules: ALL, pass: 1 });
    await reader.readBundle({ bundleDir: dir, manifest: manifestOf(6), rules: ALL, pass: 2 });
    assert.equal(ocr.created(), 1);
    assert.deepEqual(inner.seen, [{ seqs: [1], pass: 1 }, { seqs: [1], pass: 2 }]);
});

test("a bundle with fewer images than minImages goes straight to the agent, with no OCR and no prefilter note", async () => {
    const dir = bundleDirWithImages([[1280, 517], PHOTO]);
    const inner = fakeInner();
    const ocr = fakeOcr({});
    const reader = makePrefilterReader({ inner: inner.reader, createOcr: ocr.create, minImages: 3, concurrency: 2 });
    const r = await reader.readBundle({ bundleDir: dir, manifest: manifestOf(2), rules: ALL, pass: 1 });
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.reading.prefilter, undefined);
    assert.equal(ocr.created(), 0);
    assert.deepEqual(inner.seen, [{ seqs: [1, 2], pass: 1 }]);
});

test("a minutes form is kept when its rule is on and dropped, still named bienban, when its rule is off", async () => {
    const sizes: Array<[number, number]> = [[763, 1280], [1280, 517], PHOTO];
    const texts = { "01.jpg": SAMPLE.bienbanA, "02.jpg": SAMPLE.leaveTable };
    const on = fakeInner();
    await makePrefilterReader({ inner: on.reader, createOcr: fakeOcr(texts).create, minImages: 3, concurrency: 2 }).readBundle({ bundleDir: bundleDirWithImages(sizes), manifest: manifestOf(3), rules: ALL, pass: 1 });
    assert.deepEqual(on.seen, [{ seqs: [1, 2], pass: 1 }]);

    const off = fakeInner();
    const r = await makePrefilterReader({ inner: off.reader, createOcr: fakeOcr(texts).create, minImages: 3, concurrency: 2 }).readBundle({ bundleDir: bundleDirWithImages(sizes), manifest: manifestOf(3), rules: NO_MINUTES, pass: 1 });
    assert.deepEqual(off.seen, [{ seqs: [2], pass: 1 }]);
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.reading.prefilter?.dropped.find((d) => d.seq === 1), { seq: 1, loai: "bienban", chars: SAMPLE.bienbanA.length });
});

test("an unsure image (company heading but no sign of a type) is kept for the agent", async () => {
    const inner = fakeInner();
    const reader = makePrefilterReader({ inner: inner.reader, createOcr: fakeOcr({ "01.jpg": SAMPLE.headingOnly }).create, minImages: 3, concurrency: 2 });
    await reader.readBundle({ bundleDir: bundleDirWithImages([[1280, 517], PHOTO, PHOTO]), manifest: manifestOf(3), rules: ALL, pass: 1 });
    assert.deepEqual(inner.seen, [{ seqs: [1], pass: 1 }]);
});

test("a bundle with nothing to read (every image is unrelated) is sent whole: the documented worst case equals today's cost", async () => {
    const inner = fakeInner();
    const reader = makePrefilterReader({ inner: inner.reader, createOcr: fakeOcr({}).create, minImages: 3, concurrency: 2 });
    const r = await reader.readBundle({ bundleDir: bundleDirWithImages([PHOTO, PHOTO, PHOTO, PHOTO]), manifest: manifestOf(4), rules: ALL, pass: 1 });
    assert.deepEqual(inner.seen, [{ seqs: [1, 2, 3, 4], pass: 1 }]);
    assert.ok(r.ok);
    if (r.ok) {
        assert.equal(r.reading.prefilter?.fallback, true);
        assert.equal(r.reading.prefilter?.kept.length, 4);
        assert.equal(r.reading.prefilter?.dropped.length, 0);
    }
});

test("when OCR cannot run at all every image is unsure and the whole bundle goes to the agent", async () => {
    const inner = fakeInner();
    const broken = () => ({ recognize: async () => { throw new Error("không có dữ liệu vie"); }, close: async () => undefined });
    const logs: string[] = [];
    const reader = makePrefilterReader({ inner: inner.reader, createOcr: broken, minImages: 3, concurrency: 2, log: (m) => logs.push(m) });
    const r = await reader.readBundle({ bundleDir: bundleDirWithImages([PHOTO, PHOTO, PHOTO]), manifest: manifestOf(3), rules: ALL, pass: 1 });
    assert.ok(r.ok);
    assert.deepEqual(inner.seen, [{ seqs: [1, 2, 3], pass: 1 }]);
    assert.ok(logs.some((l) => /vie/.test(l)), "the OCR failure is logged");
});

test("an agent error is passed through unchanged", async () => {
    const inner = fakeInner({ ok: false, error: "HTTP 429" });
    const reader = makePrefilterReader({ inner: inner.reader, createOcr: fakeOcr(sixTexts).create, minImages: 3, concurrency: 2 });
    const r = await reader.readBundle({ bundleDir: bundleDirWithImages(sixSizes), manifest: manifestOf(6), rules: ALL, pass: 1 });
    assert.deepEqual(r, { ok: false, error: "HTTP 429" });
});
