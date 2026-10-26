import { test } from "node:test";
import assert from "node:assert/strict";
import { levenshtein, normalizeName, suggestNames } from "../src/leave/names.js";

test("normalizeName drops accents, maps đ to d, lowercases and squeezes spaces and punctuation", () => {
    assert.equal(normalizeName("Lê  Văn Hùng"), "le van hung");
    assert.equal(normalizeName("  Trần Minh Đạt "), "tran minh dat");
    assert.equal(normalizeName("Nguyễn-Văn.A"), "nguyen van a");
    assert.equal(normalizeName("NGUYỄN THU HÀ"), "nguyen thu ha");
    assert.equal(normalizeName(""), "");
    assert.equal(normalizeName("Nguyễn Thu Hà"), normalizeName("nguyen thu ha"));
});

test("levenshtein counts single-character edits", () => {
    assert.equal(levenshtein("abc", "abc"), 0);
    assert.equal(levenshtein("abc", "abd"), 1);
    assert.equal(levenshtein("abc", "ab"), 1);
    assert.equal(levenshtein("", "abc"), 3);
});

const ROSTER = ["Trần Minh Đạt", "Lê Văn Hùng", "Nguyễn Thu Hà", "Lý Ngọc Anh"];

test("suggestNames offers same words in another order, a missing middle name, and one-letter slips; never the exact match", () => {
    assert.deepEqual(suggestNames("Hùng Văn Lê", ROSTER), ["Lê Văn Hùng"]);
    assert.deepEqual(suggestNames("Lê Hùng", ROSTER), ["Lê Văn Hùng"]);
    assert.deepEqual(suggestNames("Nguyen Thu Hu", ROSTER), ["Nguyễn Thu Hà"]);
    assert.deepEqual(suggestNames("Nguyễn Thu Hà", ROSTER), [], "an exact match is a match, not a suggestion");
    assert.deepEqual(suggestNames("Nguyễn Văn Zzz", ROSTER), []);
    assert.deepEqual(suggestNames("", ROSTER), []);
});

test("suggestNames returns at most max suggestions, best first, each name once", () => {
    const roster = ["An Binh", "An Binh", "An Bình X", "Ann Binh", "Anh Binh"];
    const got = suggestNames("An Binhh", roster, 2);
    assert.equal(got.length, 2);
    assert.equal(new Set(got).size, 2);
});
