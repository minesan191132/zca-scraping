import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { OCR_CACHE_FILE, scanBundleImages } from "../src/vision/imageScan.js";
import { bundleDirWithImages } from "./helpers/imageFixtures.js";
import { fakeOcr } from "./helpers/ocrFixtures.js";
import { SAMPLE } from "./helpers/ocrSamples.js";
import { manifestOf } from "./helpers/visionFixtures.js";

const sizes: Array<[number, number]> = [[1280, 517], [4000, 3000], [2000, 1500]];
const texts = { "01.jpg": SAMPLE.leaveTable, "02.jpg": "", "03.jpg": SAMPLE.speed };

test("each image is classified from its OCR text and size, in manifest order", async () => {
    const dir = bundleDirWithImages(sizes);
    const ocr = fakeOcr(texts);
    const scanned = await scanBundleImages(dir, manifestOf(3), ocr.create, 2);
    assert.deepEqual(scanned.map((s) => [s.seq, s.file, s.cls]), [[1, "01.jpg", "leave"], [2, "02.jpg", "khac"], [3, "03.jpg", "speedtest"]]);
    assert.deepEqual([scanned[0].width, scanned[0].height], [1280, 517]);
    assert.ok(scanned[0].chars > 100);
    assert.equal(scanned[1].chars, 0);
});

test("results are cached in ocr.json: a second scan creates no OCR engine and reads no image", async () => {
    const dir = bundleDirWithImages(sizes);
    const first = fakeOcr(texts);
    await scanBundleImages(dir, manifestOf(3), first.create, 2);
    assert.ok(fs.existsSync(path.join(dir, OCR_CACHE_FILE)));
    const second = fakeOcr(texts);
    const again = await scanBundleImages(dir, manifestOf(3), second.create, 2);
    assert.equal(second.created(), 0);
    assert.deepEqual(again.map((s) => s.cls), ["leave", "khac", "speedtest"]);
});

test("a new image in an already-scanned bundle is the only one sent to OCR; a changed file size is scanned again", async () => {
    const dir = bundleDirWithImages(sizes);
    await scanBundleImages(dir, manifestOf(3), fakeOcr(texts).create, 2);
    // một ảnh mới (04.jpg) và ảnh 02.jpg bị thay bằng file khác kích thước
    fs.writeFileSync(path.join(dir, "04.jpg"), fs.readFileSync(path.join(dir, "03.jpg")));
    fs.appendFileSync(path.join(dir, "02.jpg"), Buffer.from([1, 2, 3]));
    const ocr = fakeOcr({ ...texts, "04.jpg": SAMPLE.speed });
    const scanned = await scanBundleImages(dir, manifestOf(4), ocr.create, 2);
    assert.deepEqual(ocr.recognized().sort(), ["02.jpg", "04.jpg"]);
    assert.equal(scanned[3].cls, "speedtest");
});

test("two images with the same size are scanned separately, by file name", async () => {
    const dir = bundleDirWithImages([[2000, 1500], [2000, 1500]]);
    const ocr = fakeOcr({ "01.jpg": SAMPLE.speed, "02.jpg": SAMPLE.netsupport });
    const scanned = await scanBundleImages(dir, manifestOf(2), ocr.create, 2);
    assert.deepEqual(scanned.map((s) => s.cls), ["speedtest", "khac"]);
});

test("an OCR failure on one image makes only that image unsure, with the reason", async () => {
    const dir = bundleDirWithImages(sizes);
    const ocr = fakeOcr({ ...texts, "02.jpg": new Error("worker died") });
    const scanned = await scanBundleImages(dir, manifestOf(3), ocr.create, 2);
    assert.deepEqual(scanned.map((s) => s.cls), ["leave", "khong_chac", "speedtest"]);
    assert.match(scanned[1].error ?? "", /worker died/);
    // ảnh lỗi không được ghi vào cache: lần sau thử lại
    const retry = fakeOcr(texts);
    const again = await scanBundleImages(dir, manifestOf(3), retry.create, 2);
    assert.deepEqual(retry.recognized(), ["02.jpg"]);
    assert.equal(again[1].cls, "khac");
});

test("a missing image file is unsure and does not stop the others", async () => {
    const dir = bundleDirWithImages(sizes);
    fs.rmSync(path.join(dir, "02.jpg"));
    const scanned = await scanBundleImages(dir, manifestOf(3), fakeOcr(texts).create, 2);
    assert.deepEqual(scanned.map((s) => s.cls), ["leave", "khong_chac", "speedtest"]);
    assert.ok(scanned[1].error);
});

test("an engine that cannot start leaves every image unsure instead of throwing", async () => {
    const dir = bundleDirWithImages(sizes);
    const broken = () => ({ recognize: async () => { throw new Error("không tải được dữ liệu vie"); }, close: async () => undefined });
    const scanned = await scanBundleImages(dir, manifestOf(3), broken, 2);
    assert.deepEqual(scanned.map((s) => s.cls), ["khong_chac", "khong_chac", "khong_chac"]);
    assert.match(scanned[0].error ?? "", /vie/);
});

test("a corrupt ocr.json is ignored", async () => {
    const dir = bundleDirWithImages(sizes);
    fs.writeFileSync(path.join(dir, OCR_CACHE_FILE), "{ hỏng");
    const scanned = await scanBundleImages(dir, manifestOf(3), fakeOcr(texts).create, 2);
    assert.deepEqual(scanned.map((s) => s.cls), ["leave", "khac", "speedtest"]);
});
