import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyImage, normalizeText } from "../src/vision/imageClassifier.js";
import { SAMPLE } from "./helpers/ocrSamples.js";

const LANDSCAPE = { width: 1280, height: 517 };
const PORTRAIT = { width: 763, height: 1280 };
const PHOTO = { width: 4000, height: 3000 };

test("normalizeText removes diacritics, lowercases and collapses spaces", () => {
    assert.equal(normalizeText("KỸ  THUẬT\nNGHĨ PHÉP Đã"), "ky thuat nghi phep da");
});

test("a speed test photo is a speedtest", () => {
    assert.equal(classifyImage(SAMPLE.speed, PHOTO).cls, "speedtest");
    assert.equal(classifyImage("Your Internet speed is\n6.5 Mbps", PHOTO).cls, "speedtest");
});

test("the leave table is a leave both when OCR reads its labels and when it only reads the company heading (shape decides)", () => {
    assert.equal(classifyImage(SAMPLE.leaveOld, LANDSCAPE).cls, "leave");
    assert.equal(classifyImage(SAMPLE.leaveTable, LANDSCAPE).cls, "leave");
});

test("without the shape, the garbled leave table is only unsure, never a wrong type", () => {
    assert.equal(classifyImage(SAMPLE.leaveTable, null).cls, "khong_chac");
    assert.equal(classifyImage(SAMPLE.leaveTable, PHOTO).cls, "khong_chac");
});

test("a handwritten minutes form is a bienban, even when OCR breaks the title, and is never taken for a leave", () => {
    assert.equal(classifyImage(SAMPLE.bienbanA, PORTRAIT).cls, "bienban");
    assert.equal(classifyImage(SAMPLE.bienbanB, PORTRAIT).cls, "bienban");
    const r = classifyImage(SAMPLE.bienbanB, PORTRAIT);
    assert.equal(r.scores.leave, 0);
});

test("leave and minutes share the company heading, which alone decides nothing", () => {
    assert.equal(classifyImage(SAMPLE.headingOnly, LANDSCAPE).cls, "khong_chac");
    assert.equal(classifyImage(SAMPLE.headingOnly, PORTRAIT).cls, "khong_chac");
    assert.equal(classifyImage(SAMPLE.headingOnly, null).cls, "khong_chac");
});

test("unrelated photos and empty text are khac", () => {
    assert.equal(classifyImage(SAMPLE.netsupport, PHOTO).cls, "khac");
    assert.equal(classifyImage("", PHOTO).cls, "khac");
    assert.equal(classifyImage("   \n  ", null).cls, "khac");
});

test("two types with equal strong evidence are unsure, not a coin toss", () => {
    // "nghi phep" cho nghỉ phép 5 điểm; "bien ban" (4) cộng "phong may" (1) cho biên bản cũng 5 điểm
    const both = "KỸ THUẬT NGHỈ PHÉP\nBIÊN BẢN PHÒNG MÁY";
    const r = classifyImage(both, null);
    assert.deepEqual([r.scores.leave, r.scores.bienban], [5, 5]);
    assert.equal(r.cls, "khong_chac");
});
