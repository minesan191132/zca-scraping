import { test } from "node:test";
import assert from "node:assert/strict";
import { imageSizeOf } from "../src/vision/imageSize.js";
import { jpegBytes, pngBytes } from "./helpers/imageFixtures.js";

test("reads the width and height of a JPEG, baseline or progressive", () => {
    assert.deepEqual(imageSizeOf(jpegBytes(1280, 517)), { width: 1280, height: 517 });
    assert.deepEqual(imageSizeOf(jpegBytes(2560, 1920, 0xc2)), { width: 2560, height: 1920 });
});

test("reads the width and height of a PNG", () => {
    assert.deepEqual(imageSizeOf(pngBytes(763, 1280)), { width: 763, height: 1280 });
});

test("returns null for anything it does not recognise, never throws", () => {
    assert.equal(imageSizeOf(Buffer.alloc(0)), null);
    assert.equal(imageSizeOf(Buffer.from("not an image at all")), null);
    assert.equal(imageSizeOf(Buffer.from([0xff, 0xd8])), null, "a JPEG that stops before any SOF marker");
    assert.equal(imageSizeOf(jpegBytes(10, 10).subarray(0, 12)), null, "a JPEG cut in the middle of its header");
});
