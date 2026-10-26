import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { MasterRow } from "../src/master/masterIndex.js";
import { findRow } from "../src/master/masterMatch.js";

const row = (n: number, key: string, khuVuc: string, room = ""): MasterRow => ({ sheet: "TP HCM", row: n, schoolKey: key, khuVuc, room, dateRef: `H${n}`, speedRef: null, date: null, speed: null });
const rows = [
    row(4, "th an binh", "q2"),
    row(5, "thcs an binh", "di an"),
    row(6, "thcs an binh", "binh thuan"),
    row(7, "thcs vinh loc b", "bc", "1"),
    row(8, "thcs vinh loc b", "bc", "3"),
];

test("một dòng duy nhất theo khóa trường", () => {
    const m = findRow(rows, "th an binh", "q2", null);
    assert.equal(m.kind === "ok" && m.row.row, 4);
});
test("trùng tên khác khu vực: lấy khu vực để phân biệt (không phân biệt dấu/hoa)", () => {
    const m = findRow(rows, "thcs an binh", "Dĩ An", null);
    assert.equal(m.kind === "ok" && m.row.row, 5);
});
test("trùng tên mà khu vực không giúp được: mơ hồ", () => {
    assert.deepEqual(findRow(rows, "thcs an binh", "q9", null), { kind: "ambiguous", count: 2 });
});
test("không có trường: none", () => {
    assert.deepEqual(findRow(rows, "thcs khong ton tai", "q1", null), { kind: "none" });
});
test("tệp có phòng: phải khớp cả phòng; phòng không có thì none", () => {
    const m = findRow(rows, "thcs vinh loc b", "bc", "3");
    assert.equal(m.kind === "ok" && m.row.row, 8);
    assert.deepEqual(findRow(rows, "thcs vinh loc b", "bc", "2"), { kind: "none" });
});

test("một dòng duy nhất nhưng KHÁC khu vực là trường khác cùng tên: không ghép", () => {
    assert.deepEqual(findRow(rows, "th an binh", "bd", null), { kind: "other_area" });
});
test("tin không ghi khu vực, hoặc dòng không có khu vực: ghép theo tên", () => {
    const m1 = findRow(rows, "th an binh", "", null);
    assert.equal(m1.kind === "ok" && m1.row.row, 4);
    const m2 = findRow([row(9, "th moi", "")], "th moi", "q1", null);
    assert.equal(m2.kind === "ok" && m2.row.row, 9);
});

// Khu vực qua bảng mã (schoolArea): tin ghi "THỦ ĐỨC", file tổng ghi "TĐ".
const vinh = [
    row(41, "th luong the vinh", "q7", "1"),
    row(186, "th luong the vinh", "q7", "2"),
    row(342, "th luong the vinh", "td", "2"),
    row(283, "th luong the vinh", "td", "3"),
];

test("tin ghi tên khu vực đầy đủ, file ghi mã: phân biệt được qua bảng mã", () => {
    const m = findRow(vinh, "th luong the vinh", "THỦ ĐỨC", "2");
    assert.equal(m.kind === "ok" && m.row.row, 342);
    const q = findRow(vinh, "th luong the vinh", "Quận 7", "2");
    assert.equal(q.kind === "ok" && q.row.row, 186);
});
test("một dòng duy nhất: tên đầy đủ khớp mã, khu vực khác mã vẫn là trường khác", () => {
    const one = [row(57, "th luong the vinh - td", "td")];
    assert.equal(findRow(one, "th luong the vinh - td", "THỦ ĐỨC", null).kind, "ok");
    assert.deepEqual(findRow(one, "th luong the vinh - td", "Q7", null), { kind: "other_area" });
});
test("khớp nguyên văn thắng bảng mã: file có cả q9 và td vẫn phân biệt, không thành mơ hồ", () => {
    const both = [row(1, "th a", "q9"), row(2, "th a", "td")];
    const q9 = findRow(both, "th a", "Q9", null);
    assert.equal(q9.kind === "ok" && q9.row.row, 1);
    const td = findRow(both, "th a", "TĐ", null);
    assert.equal(td.kind === "ok" && td.row.row, 2);
});
test("hai dòng cùng mã sau khi qua bảng mã (q2 và q9 đều là TĐ): mơ hồ, không ghi lặng lẽ", () => {
    const two = [row(1, "th a", "q2"), row(2, "th a", "q9")];
    assert.deepEqual(findRow(two, "th a", "THỦ ĐỨC", null), { kind: "ambiguous", count: 2 });
});
test("khu vực không có trong bảng mã: so như trước", () => {
    const rs = [row(1, "th a", "khu la"), row(2, "th a", "khu khac")];
    assert.equal(findRow(rs, "th a", "Khu Lạ", null).kind === "ok", true);
    assert.deepEqual(findRow(rs, "th a", "khu khong co", null), { kind: "ambiguous", count: 2 });
});

import { areaCode } from "../src/lesson/schoolArea.js";
import { schoolKeys } from "../src/master/masterKeys.js";

test("areaCode: khớp cả chuỗi theo tên, mã, dấu chấm và hoa thường; chữ lạ hoặc chỉ chứa đuôi thì null", () => {
    assert.equal(areaCode("THỦ ĐỨC"), "TĐ");
    assert.equal(areaCode("thu duc"), "TĐ");
    assert.equal(areaCode("Q.9"), "TĐ");
    assert.equal(areaCode("TĐ"), "TĐ");
    assert.equal(areaCode("Quận 7"), "Q7");
    assert.equal(areaCode("TP. HCM"), "TP HCM");
    assert.equal(areaCode("Phường Thủ Đức"), null);
    assert.equal(areaCode(""), null);
});

test("schoolKeys: thêm khóa hậu tố bằng mã ngay sau khóa hậu tố nguyên văn, giữ nguyên thứ tự các khóa khác", () => {
    assert.deepEqual(schoolKeys("TH", "LƯƠNG THẾ VINH", "", "THỦ ĐỨC"), ["th luong the vinh", "th luong the vinh - thu duc", "th luong the vinh - td", "luong the vinh"]);
    assert.deepEqual(schoolKeys("TH", "KIM ĐỒNG", "", "Q6"), ["th kim dong", "th kim dong - q6", "kim dong"]);
    assert.deepEqual(schoolKeys("TH", "A", "", "KHU LẠ"), ["th a", "th a - khu la", "a"]);
});
