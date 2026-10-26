import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { reviewPath, writeReview } from "../src/definitions/review.js";
import type { ReviewItem } from "../src/definitions/engine.js";

const item = (msgId: string): ReviewItem => ({ code: "shiftEnd", msgId, ts: 1, reason: "thieu-nhan", missing: ["ten truong"] });

test("writeReview ghi hai mục rồi đọc lại bằng nhau", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "zbot-review-")), "sub", "canxem.json");
    writeReview(file, [item("a"), item("b")]);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), [item("a"), item("b")]);
});

test("writeReview với danh sách rỗng xóa file", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "zbot-review-")), "canxem.json");
    writeReview(file, [item("a")]);
    writeReview(file, []);
    assert.equal(fs.existsSync(file), false);
});

test("reviewPath dùng tiền tố canxem_, không phải review_", () => {
    const p = reviewPath("NguoiA", "shiftEnd", "2026-10-24");
    assert.match(path.basename(p), /^canxem_shiftEnd_2026-10-24\.json$/);
});
