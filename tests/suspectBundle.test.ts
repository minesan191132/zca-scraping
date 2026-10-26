import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { suspectTitle } from "../src/vision/suspectBundle.js";
import { makePrefilterReader } from "../src/vision/prefilterReader.js";
import { readBundles } from "../src/vision/pipeline.js";
import { loadRules } from "../src/vision/rules.js";
import { bundleDirWithImages } from "./helpers/imageFixtures.js";
import { fakeOcr } from "./helpers/ocrFixtures.js";
import { SAMPLE } from "./helpers/ocrSamples.js";
import { leaveReadingOf, leaveRow, manifestOf, T0 } from "./helpers/visionFixtures.js";
import type { Manifest, ReadInput, ReadResult, VisionReader } from "../src/types/index.js";

const ALL = loadRules();
const PHOTO: [number, number] = [4000, 3000];
const withText = (n: number, ...contents: string[]): Manifest => manifestOf(n, { texts: contents.map((content, i) => ({ msgId: `t${i}`, ts: T0, content })) });
const ROLL = "ĐIỂM DANH ĐẦU BUỔI\n- Tên Trường: TH A";

test("suspectTitle: điểm danh đầu/cuối buổi và công việc đầu ca là nghi; cuối ca, tin lạ và không tin thì không", () => {
    assert.equal(suspectTitle(withText(1, ROLL)), "ĐIỂM DANH ĐẦU BUỔI");
    assert.equal(suspectTitle(withText(1, "điểm danh cuối buổi")), "điểm danh cuối buổi");
    assert.equal(suspectTitle(withText(1, "CÔNG VIỆC ĐẦU CA LÀM\n- Tên Trường: X")), "CÔNG VIỆC ĐẦU CA LÀM");
    assert.equal(suspectTitle(withText(1, "CÔNG VIỆC CUỐI CA LÀM\n- Tên Trường: X")), null, "ảnh biên bản đi cùng tin cuối ca");
    assert.equal(suspectTitle(withText(2, ROLL, "CÔNG VIỆC CUỐI CA LÀM\n- Tên Trường: TH A")), null, "điểm danh gửi cạnh tin cuối ca: ảnh biên bản có thể ở bộ này");
    assert.equal(suspectTitle(withText(1, "em xin nghỉ")), null);
    assert.equal(suspectTitle(withText(1)), null);
    assert.equal(suspectTitle(withText(2, "Đkkd", ROLL)), "ĐIỂM DANH ĐẦU BUỔI", "chỉ cần một tin kèm là tiêu đề nghi");
});

function innerCounting(): { reader: VisionReader; calls: number[][] } {
    const calls: number[][] = [];
    return {
        calls,
        reader: {
            async readBundle(input: ReadInput) {
                calls.push(input.manifest.images.map((i) => i.seq));
                return { ok: true, reading: { bundleId: input.manifest.bundleId, readAt: T0, reader: { kind: "openrouter", model: "m", promptVersion: "2", ruleVersions: {} }, images: input.manifest.images.map((i) => ({ seq: i.seq, loai: "agent", doTinCay: "cao" as const })), extracted: {} } };
            },
        },
    };
}
const prefilter = (inner: VisionReader, texts: Record<string, string>) => {
    const ocr = fakeOcr(texts);
    return { ocr, reader: makePrefilterReader({ inner, createOcr: ocr.create, minImages: 3, concurrency: 2, suspectTitle }) };
};

test("bộ kèm tin điểm danh, OCR không thấy ảnh cần đọc: bỏ cả bộ, không gọi agent, kể cả khi chỉ 1 ảnh", async () => {
    for (const n of [1, 5]) {
        const dir = bundleDirWithImages(Array.from({ length: n }, () => PHOTO));
        const inner = innerCounting();
        const { reader } = prefilter(inner.reader, {});
        const r = await reader.readBundle({ bundleDir: dir, manifest: withText(n, ROLL), rules: ALL, pass: 1 });
        assert.ok(r.ok);
        if (!r.ok) return;
        assert.equal(inner.calls.length, 0);
        assert.ok(r.reading.images.every((i) => i.loai === "khac"));
        assert.equal(r.reading.prefilter?.skipped, "ĐIỂM DANH ĐẦU BUỔI");
        assert.equal(r.reading.prefilter?.fallback, false);
        assert.equal(r.reading.prefilter?.dropped.length, n);
    }
});

test("bộ kèm tin điểm danh có một bảng nghỉ phép lẫn trong đó: chỉ ảnh nghỉ phép tới agent", async () => {
    const dir = bundleDirWithImages([[1280, 517], PHOTO, PHOTO]);
    const inner = innerCounting();
    const { reader } = prefilter(inner.reader, { "01.jpg": SAMPLE.leaveTable });
    const r = await reader.readBundle({ bundleDir: dir, manifest: withText(3, ROLL), rules: ALL, pass: 1 });
    assert.ok(r.ok);
    assert.deepEqual(inner.calls, [[1]]);
    if (r.ok) assert.equal(r.reading.prefilter?.skipped, undefined);
});

test("bộ kèm tin CUỐI CA LÀM hoặc không kèm tin: đường cũ (ít ảnh thì thẳng agent, không OCR)", async () => {
    for (const manifest of [withText(2, "CÔNG VIỆC CUỐI CA LÀM\n- Tên Trường: X"), withText(2)]) {
        const dir = bundleDirWithImages([PHOTO, PHOTO]);
        const inner = innerCounting();
        const { reader, ocr } = prefilter(inner.reader, {});
        const r = await reader.readBundle({ bundleDir: dir, manifest, rules: ALL, pass: 1 });
        assert.ok(r.ok);
        assert.deepEqual(inner.calls, [[1, 2]]);
        assert.equal(ocr.created(), 0);
    }
});

test("đọc tay (force) không bỏ bộ theo tiêu đề: bộ điểm danh 1 ảnh vẫn tới agent", async () => {
    const dir = bundleDirWithImages([PHOTO]);
    const inner = innerCounting();
    const { reader } = prefilter(inner.reader, {});
    const r = await reader.readBundle({ bundleDir: dir, manifest: withText(1, ROLL), rules: ALL, pass: 1, force: true });
    assert.ok(r.ok);
    assert.deepEqual(inner.calls, [[1]]);
});

test("readBundles: bộ bị bỏ theo tiêu đề không tính vào maxBundles, bộ thật phía sau vẫn được đọc", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "skip-"));
    const make = (id: string, extra: Partial<Manifest>): void => {
        const dir = path.join(root, "2026-10-07", "g1", id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifestOf(1, { bundleId: id, ...extra })), "utf8");
    };
    ["a", "b", "c"].forEach((id) => make(id, { texts: [{ msgId: "t", ts: T0, content: ROLL }] }));
    ["d", "e"].forEach((id) => make(id, {}));
    const reader: VisionReader = {
        async readBundle({ manifest }): Promise<ReadResult> {
            const skipped = manifest.texts.length > 0;
            const base = skipped ? { ...leaveReadingOf([]), images: [{ seq: 1, loai: "khac", doTinCay: "cao" as const }], prefilter: { fallback: false, kept: [], dropped: [], skipped: "ĐIỂM DANH ĐẦU BUỔI" } } : leaveReadingOf([leaveRow()]);
            return { ok: true, reading: { ...base, bundleId: manifest.bundleId } };
        },
    };
    const s = await readBundles(root, { again: false, dryRun: false, maxBundles: 1 }, { reader, rules: ALL, cfg: { maxPastDays: 7, maxFutureDays: 120 }, log: () => undefined });
    assert.deepEqual(s.read.map((r) => [path.basename(r.dir), r.skipped]), [["a", true], ["b", true], ["c", true], ["d", false]]);
    assert.equal(s.overLimit, 1);
});
