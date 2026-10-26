import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { InternetSpeedEntry } from "../src/lesson/internetSpeedReport.js";
import type { MaintenanceEntry } from "../src/lesson/maintenanceReport.js";
import { excelDateSerialForDay } from "../src/lesson/statusReportLayout.js";
import type { MasterRow } from "../src/master/masterIndex.js";
import { internetSpeedPatch, maintenancePatch } from "../src/master/masterPatch.js";

const noon = (day: string) => Date.parse(`${day}T12:00:00+07:00`);
const S = (day: string) => excelDateSerialForDay(day);

const mrow = (n: number, key: string, khuVuc: string, room: string, date: number | null, speed: number | null, sheet = "TP HCM"): MasterRow => ({
    sheet, row: n, schoolKey: key, khuVuc, room, dateRef: `${room ? "J" : "H"}${n}`, speedRef: room ? `F${n}` : null, date, speed,
});
const maint = (cap: string, tenTruong: string, khuVuc: string, day: string, id = "m1", coSo = ""): MaintenanceEntry => ({ maNhom: "g", maTinNhan: id, thoiGian: noon(day), cap, tenTruong, khuVuc, coSo });
const net = (over: Partial<InternetSpeedEntry>, day = "2026-10-09"): InternetSpeedEntry => ({
    cap: "THCS", tenTruong: "VĨNH LỘC B", khuVuc: "BC", coSo: "", phongMay: "PM1", mbps: null, thoiGian: noon(day), maTinNhan: "m1", ...over,
});

test("bảo trì: ghi ngày của tin vào ô BẢO TRÌ GN của đúng dòng", () => {
    const rows = [mrow(76, "thcs vinh loc b", "bc", "", S("2026-09-28"), null)];
    const r = maintenancePatch([maint("THCS", "VĨNH LỘC B", "BC", "2026-10-09")], rows);
    assert.deepEqual(r.cells.map((c) => [c.sheet, c.cell, c.value]), [["TP HCM", "H76", S("2026-10-09")]]);
    assert.deepEqual(r.review, []);
});

test("bảo trì: ngày của tin cũ hơn ô thì không ghi; bằng nhau thì không ghi", () => {
    const rows = [mrow(4, "th vo thi sau", "gv", "", S("2026-10-03"), null), mrow(5, "th an binh", "q2", "", S("2026-10-09"), null)];
    const r = maintenancePatch([maint("TH", "VÕ THỊ SÁU", "GV", "2026-09-01"), maint("TH", "AN BÌNH", "Q2", "2026-10-09")], rows);
    assert.deepEqual(r.cells, []);
    assert.deepEqual(r.review, []);
});

test("bảo trì: ô ngày đang trống thì ghi; không khớp và mơ hồ vào danh sách cần xem, không ghi", () => {
    const rows = [mrow(4, "th a", "q1", "", null, null), mrow(5, "th b", "q1", "", S("2026-10-01"), null), mrow(6, "th b", "q1", "", S("2026-10-01"), null)];
    const r = maintenancePatch([maint("TH", "A", "Q1", "2026-10-09", "a"), maint("TH", "B", "Q1", "2026-10-09", "b"), maint("TH", "KHÔNG CÓ", "Q1", "2026-10-09", "c")], rows);
    assert.deepEqual(r.cells.map((c) => c.cell), ["H4"]);
    assert.deepEqual(r.review.map((x) => [x.msgId, x.reason]), [["b", "mo_ho"], ["c", "khong_khop"]]);
});

test("internet: ghi tốc độ và ngày của đúng phòng; phòng khác của trường không bị đụng", () => {
    const rows = [mrow(174, "thcs vinh loc b", "bc", "1", S("2026-09-28"), 84), mrow(427, "thcs vinh loc b", "bc", "2", S("2026-09-28"), 90), mrow(307, "thcs vinh loc b", "bc", "3", S("2026-09-28"), 95)];
    const r = internetSpeedPatch([net({ phongMay: "PM1", mbps: 45.2 }), net({ phongMay: "PM3", mbps: 12.5 })], rows);
    assert.deepEqual(r.cells.map((c) => [c.cell, c.value]), [["F174", 45.2], ["J174", S("2026-10-09")], ["F307", 12.5], ["J307", S("2026-10-09")]]);
});

test("internet: tốc độ 0 (trống hoặc ghi 0 trong tin) được ghi là 0, ô XẾP LOẠI của file tự ra D", () => {
    const rows = [mrow(10, "thcs vinh loc b", "bc", "1", S("2026-09-28"), 50), mrow(11, "thcs vinh loc b", "bc", "2", S("2026-09-28"), 50)];
    const r = internetSpeedPatch([net({ phongMay: "PM1", mbps: 0 }), net({ phongMay: "PM2", mbps: 0 })], rows);
    assert.deepEqual(r.cells.filter((c) => c.cell.startsWith("F")).map((c) => c.value), [0, 0]);
});

test("internet: chưa có tốc độ đọc được thì không ghi gì; ngày cũ hơn thì không ghi", () => {
    const rows = [mrow(10, "thcs vinh loc b", "bc", "1", S("2026-10-05"), 50), mrow(11, "thcs vinh loc b", "bc", "2", S("2026-10-09"), 50)];
    const r = internetSpeedPatch([net({ phongMay: "PM1", mbps: null }), net({ phongMay: "PM2", mbps: 60 }, "2026-10-01")], rows);
    assert.deepEqual(r.cells, []);
});

test("internet: cùng ngày đo lại thì chỉ ghi tốc độ (ngày đã bằng), giá trị y hệt thì không ghi", () => {
    const rows = [mrow(10, "thcs vinh loc b", "bc", "1", S("2026-10-09"), 40), mrow(11, "thcs vinh loc b", "bc", "2", S("2026-10-09"), 30)];
    const r = internetSpeedPatch([net({ phongMay: "PM1", mbps: 45 }), net({ phongMay: "PM2", mbps: 30 })], rows);
    assert.deepEqual(r.cells.map((c) => [c.cell, c.value]), [["F10", 45]]);
});

test("internet: phòng không có trong file đưa vào danh sách cần xem kèm phòng", () => {
    const r = internetSpeedPatch([net({ phongMay: "PM9", mbps: 10, maTinNhan: "z" })], [mrow(10, "thcs vinh loc b", "bc", "1", null, null)]);
    assert.deepEqual(r.review, [{ school: "THCS VĨNH LỘC B", khuVuc: "BC", room: "PM9", msgId: "z", reason: "khong_khop" }]);
});

test("trường cùng tên ở khu vực khác: vào danh sách cần xem với lý do khu_vuc_khac, không ghi", () => {
    const rows = [mrow(4, "th kim dong", "q1", "", null, null)];
    const r = maintenancePatch([maint("TH", "KIM ĐỒNG", "BD", "2026-10-09", "x")], rows);
    assert.deepEqual(r.cells, []);
    assert.deepEqual(r.review.map((x) => [x.msgId, x.reason]), [["x", "khu_vuc_khac"]]);
});

test("nhiều ngày cho cùng một dòng: chỉ còn ô của ngày MỚI NHẤT (xử lý lại các ngày trước không làm lùi)", () => {
    const rows = [mrow(76, "thcs vinh loc b", "bc", "", S("2026-09-28"), null)];
    const r = maintenancePatch([maint("THCS", "VĨNH LỘC B", "BC", "2026-10-07", "a"), maint("THCS", "VĨNH LỘC B", "BC", "2026-10-09", "b")], rows);
    assert.deepEqual(r.cells.map((c) => [c.cell, c.value]), [["H76", S("2026-10-09")]]);
});

test("internet: nhiều ngày thì tốc độ và ngày của ngày mới nhất thắng, dù thứ tự trong danh sách", () => {
    const rows = [mrow(10, "thcs vinh loc b", "bc", "1", S("2026-09-28"), 50)];
    const r = internetSpeedPatch([net({ phongMay: "PM1", mbps: 80 }, "2026-10-09"), net({ phongMay: "PM1", mbps: 60 }, "2026-10-07")], rows);
    assert.deepEqual(r.cells.map((c) => [c.cell, c.value]), [["F10", 80], ["J10", S("2026-10-09")]]);
});

test("internet: cùng phòng viết PM1 và PM 1 trong ngày: lần đo SAU CÙNG theo giờ thắng, không theo thứ tự danh sách", () => {
    const rows = [mrow(10, "thcs vinh loc b", "bc", "1", S("2026-09-28"), 50)];
    const later: InternetSpeedEntry = { ...net({ phongMay: "PM1", mbps: 80 }), thoiGian: noon("2026-10-09") + 4 * 3600_000 };
    const earlier: InternetSpeedEntry = { ...net({ phongMay: "PM 1", mbps: 0 }), thoiGian: noon("2026-10-09") - 4 * 3600_000 };
    const r = internetSpeedPatch([later, earlier], rows);
    assert.deepEqual(r.cells.filter((c) => c.cell === "F10").map((c) => c.value), [80]);
});

test("khóa dự phòng: cơ sở ở dòng Phân hiệu khớp tên có CSn trong file; trường không có cơ sở vẫn khớp khóa thường", () => {
    const rows = [mrow(4, "th binh tri 2 cs1", "btan", "", S("2026-09-01"), null), mrow(5, "th binh tri 2 cs2", "btan", "", S("2026-09-01"), null), mrow(6, "th an binh", "q2", "", S("2026-09-01"), null)];
    const r = maintenancePatch([maint("TH", "BÌNH TRỊ 2", "BTAN", "2026-10-09", "a", "CS2"), maint("TH", "AN BÌNH", "Q2", "2026-10-09", "b")], rows);
    assert.deepEqual(r.cells.map((c) => c.cell), ["H5", "H6"]);
    assert.deepEqual(r.review, []);
});

test("khóa dự phòng: thiếu cơ sở trong tin thì không đoán, vào danh sách cần xem; cơ sở không có trong file cũng vậy", () => {
    const rows = [mrow(4, "th binh tri 2 cs1", "btan", "", null, null), mrow(5, "th binh tri 2 cs2", "btan", "", null, null)];
    const r = maintenancePatch([maint("TH", "BÌNH TRỊ 2", "BTAN", "2026-10-09", "a"), maint("TH", "BÌNH TRỊ 2", "BTAN", "2026-10-09", "b", "CS9")], rows);
    assert.deepEqual(r.cells, []);
    assert.deepEqual(r.review.map((x) => [x.msgId, x.reason]), [["a", "khong_khop"], ["b", "khong_khop"]]);
});

test("khóa dự phòng: file ghi hậu tố khu vực trong tên ('TH Kim Đồng - Q6') khớp tin ghi tên và khu vực riêng", () => {
    const rows = [mrow(4, "th kim dong - q6", "q6", "", S("2026-09-01"), null), mrow(5, "th kim dong - q1", "q1", "", S("2026-09-01"), null)];
    const r = maintenancePatch([maint("TH", "KIM ĐỒNG", "Q6", "2026-10-09")], rows);
    assert.deepEqual(r.cells.map((c) => c.cell), ["H4"]);
});

test("khóa dự phòng: dòng không có tiền tố cấp trong file ('Đồng Xanh', CẤP là LC) khớp tin có cấp LC", () => {
    const rows = [mrow(125, "dong xanh", "q5", "", S("2026-09-23"), null)];
    const r = maintenancePatch([maint("LC", "ĐỒNG XANH", "Q5", "2026-10-09")], rows);
    assert.deepEqual(r.cells.map((c) => [c.cell, c.value]), [["H125", S("2026-10-09")]]);
});

test("khóa dự phòng: khóa đầu mơ hồ nhưng khóa sau khớp đúng một dòng thì ghi; không khóa nào khớp thì giữ lý do của khóa đầu tiên có dòng", () => {
    const dup = [mrow(4, "th a", "q1", "", null, null), mrow(5, "th a", "q1", "", null, null), mrow(6, "th a - q1", "q1", "", null, null)];
    assert.deepEqual(maintenancePatch([maint("TH", "A", "Q1", "2026-10-09")], dup).cells.map((c) => c.cell), ["H6"]);
    const onlyDup = [mrow(4, "th a", "q1", "", null, null), mrow(5, "th a", "q1", "", null, null)];
    assert.deepEqual(maintenancePatch([maint("TH", "A", "Q1", "2026-10-09", "z")], onlyDup).review.map((x) => x.reason), ["mo_ho"]);
});

test("internet: dòng PM theo cơ sở và khu vực viết đầy đủ; phòng viết PM2 khớp ô PM là số 2", () => {
    const rows = [mrow(10, "th binh tri 2 cs2", "btan", "2", S("2026-09-28"), 50), mrow(11, "th binh tri 2 cs2", "btan", "1", S("2026-09-28"), 50)];
    const r = internetSpeedPatch([net({ cap: "TH", tenTruong: "BÌNH TRỊ 2", khuVuc: "BTAN", coSo: "CS2", phongMay: "PM2", mbps: 90 })], rows);
    assert.deepEqual(r.cells.map((c) => [c.cell, c.value]), [["F10", 90], ["J10", S("2026-10-09")]]);
});
