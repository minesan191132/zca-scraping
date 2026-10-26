import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { internetSpeedEntries, parseInternetMessage, parseSpeedText } from "../src/lesson/internetSpeedReport.js";
import { buildInternetSpeedRows, gradeOfEntry, INTERNET_SPEED_LAYOUT, internetSpeedHeaderCells } from "../src/lesson/internetSpeedRows.js";
import { gradeOfMbps, toMbps } from "../src/speed/units.js";
import type { SourceMessage } from "../src/types/index.js";

test("toMbps converts Kbps, Mbps and Gbps and refuses any other unit", () => {
    assert.equal(toMbps(500, "Kbps"), 0.5);
    assert.equal(toMbps(95.4, "Mbps"), 95.4);
    assert.equal(toMbps(1.2, "Gbps"), 1200);
    assert.equal(toMbps(1234, "Kbps"), 1.23, "rounded to two decimals");
    for (const u of ["kb/s", "KBPS", " Kbit/s ", "kbit/s"]) assert.equal(toMbps(1000, u), 1, u);
    for (const u of ["Mb/s", "Mbit/s", " mbps "]) assert.equal(toMbps(5, u), 5, u);
    for (const u of ["MB/s", "KB/s", "bps", "", "xyz", null, undefined]) assert.equal(toMbps(5, u as string | null), null, String(u));
    assert.equal(toMbps(-1, "Mbps"), null);
    assert.equal(toMbps(Number.NaN, "Mbps"), null);
});

test("the grade follows the speed: A from 20, B from 10, C below 10", () => {
    assert.deepEqual([20, 19.99, 10, 9.99, 0.5, 300].map(gradeOfMbps), ["A", "B", "B", "C", "C", "A"]);
});

const REPORT = (school: string, area: string, room: string, tocDo: string | null, phanHieu = ""): string =>
    [
        "CÔNG VIỆC CUỐI CA LÀM",
        "- Cấp:",
        `- Tên Trường: ${school}`,
        `- Phân hiệu: ${phanHieu}`,
        `- Phường / Xã: ${area}`,
        "- Trưởng nhóm IT: Minh Phú",
        `- Phòng máy làm việc: ${room}`,
        "- Công việc hoàn thành:",
        " + Tổng số máy: 49",
        ...(tocDo === null ? [] : [` + Tốc độ Internet: ${tocDo}`]),
        " + Vệ sinh phòng máy: S",
    ].join("\n");
const msg = (content: string, ts: number, id = String(ts)): SourceMessage => ({ msgId: id, groupId: "g1", groupName: "bot test", threadType: "group", senderId: "u", senderName: "IT", isSelf: false, ts, msgType: "desktop.text", content } as SourceMessage);
const all = () => true;

test("parseSpeedText: a number with a unit is converted to Mbps; blank or 0 is 0; words without a number and byte units are not read", () => {
    assert.equal(parseSpeedText("90 mbps"), 90);
    assert.equal(parseSpeedText("90Mbps"), 90);
    assert.equal(parseSpeedText("45,5 Mb/s"), 45.5);
    assert.equal(parseSpeedText("500 kbps"), 0.5);
    assert.equal(parseSpeedText("1.2 Gbps"), 1200);
    assert.equal(parseSpeedText("30"), 30, "no unit means Mbps");
    assert.equal(parseSpeedText(""), 0, "blank means no network, as in docs/bao-cao-nhi.md");
    assert.equal(parseSpeedText("   "), 0);
    assert.equal(parseSpeedText("0"), 0);
    assert.equal(parseSpeedText("0 mbps"), 0);
    assert.equal(parseSpeedText("Không có mạng"), null);
    assert.equal(parseSpeedText("khoảng 90"), null);
    assert.equal(parseSpeedText("12 MB/s"), null, "bytes per second are not converted");
    assert.equal(parseSpeedText(null), null, "the message has no speed line");
});

test("parseInternetMessage reads the school, the working room(s) and the speed line", () => {
    const p = parseInternetMessage(REPORT("THCS Vĩnh Lộc B", "BC", "PM1", "90 mbps"))!;
    assert.deepEqual([p.cap, p.tenTruong, p.khuVuc, p.coSo, p.rooms, p.mbps], ["THCS", "VĨNH LỘC B", "BC", "", ["PM1"], 90]);
    assert.deepEqual(parseInternetMessage(REPORT("THCS A", "BC", "PM2, PM3", "50 mbps"))!.rooms, ["PM2", "PM3"]);
    assert.equal(parseInternetMessage(REPORT("THCS A", "BC", "PM1", null))!.mbps, null, "no speed line");
    assert.equal(parseInternetMessage(REPORT("THCS A", "BC", "PM1", "Không có mạng"))!.mbps, null);
    assert.equal(parseInternetMessage(REPORT("THCS A", "BC", "PM1", ""))!.mbps, 0);
    assert.equal(parseInternetMessage(REPORT("THCS A", "BC", "", "10 mbps")), null, "no working room");
    assert.equal(parseInternetMessage(REPORT("THCS A", "BC", "PM1", "10 mbps").replace("Tên Trường", "Nơi làm")), null, "no school line (\"Trường\" is now a known spelling of Tên Trường, see spellingAliases.ts)");
    assert.equal(parseInternetMessage("BÁO CÁO CUỐI BUỔI\nTên trường: THCS A - BC\n* Phòng máy: PM1\n- Internet: Có"), null, "the old form is no longer read");
    assert.equal(parseInternetMessage(REPORT("THCS A", "BC", "PM1", "10 mbps").replace("CUỐI CA", "ĐẦU CA")), null, "start of shift");
});

test("one message gives one row per working room, with the speed written in the message", () => {
    const entries = internetSpeedEntries([msg(REPORT("THCS Vĩnh Lộc B", "BC", "PM1, PM3", "45.5 mbps"), 1000, "r1")], all);
    assert.deepEqual(entries.map((e) => [e.phongMay, e.mbps, e.khuVuc, e.maTinNhan]), [["PM1", 45.5, "BC", "r1"], ["PM3", 45.5, "BC", "r1"]]);
});

test("the latest message of a room wins; a later message whose speed cannot be read keeps the earlier speed; a later 0 does replace it", () => {
    const m1 = msg(REPORT("THCS A", "BC", "PM1", "33 mbps"), 1000, "r1");
    const m2 = msg(REPORT("THCS A", "BC", "PM1", "Không có mạng"), 2000, "r2");
    const m3 = msg(REPORT("THCS A", "BC", "PM1", null), 3000, "r3");
    const e = internetSpeedEntries([m1, m2, m3], all);
    assert.equal(e.length, 1, "one row per (school, campus, area, room)");
    assert.deepEqual([e[0].mbps, e[0].maTinNhan], [33, "r3"]);
    const m4 = msg(REPORT("THCS A", "BC", "PM1", "0"), 4000, "r4");
    assert.equal(internetSpeedEntries([m1, m4], all)[0].mbps, 0);
    assert.equal(internetSpeedEntries([m4, m1], all)[0].mbps, 0, "send time decides, not list order");
});

test("the time filter, the area, the campus and the room all separate rows", () => {
    const a = msg(REPORT("THCS An Phú", "BC", "PM1", "10 mbps"), 1000);
    const b = msg(REPORT("THCS An Phú", "HM", "PM1", "10 mbps"), 2000);
    const old = msg(REPORT("THCS Cũ", "BC", "PM1", "10 mbps"), 10);
    assert.equal(internetSpeedEntries([a, b, old], all).length, 3);
    assert.equal(internetSpeedEntries([a, b, old], (ts) => ts >= 1000).length, 2);
    const cs = [msg(REPORT("TH Bình Trị 2", "BTAN", "PM1", "10 mbps", "CS1"), 1000), msg(REPORT("TH Bình Trị 2", "BTAN", "PM1", "20 mbps", "CS2"), 2000), msg(REPORT("TH Bình Trị 2", "BTAN", "PM2", "30 mbps", "CS2"), 3000)];
    assert.deepEqual(internetSpeedEntries(cs, all).map((e) => [e.coSo, e.phongMay, e.mbps]), [["CS1", "PM1", 10], ["CS2", "PM1", 20], ["CS2", "PM2", 30]]);
});

test("grades: D for speed 0 (no network), A/B/C by speed, blank when there is no speed", () => {
    const base = { cap: "", tenTruong: "X", khuVuc: "BC", coSo: "", phongMay: "PM1", thoiGian: 1, maTinNhan: "m" };
    assert.equal(gradeOfEntry({ ...base, mbps: 0 }), "D");
    assert.deepEqual([25, 12, 3].map((mbps) => gradeOfEntry({ ...base, mbps })), ["A", "B", "C"]);
    assert.equal(gradeOfEntry({ ...base, mbps: null }), "");
});

test("rows are sorted D, C, B, A, with rooms that have no grade last; slower first inside a grade; blank columns stay blank", () => {
    const e = (tenTruong: string, mbps: number | null) => ({ cap: "THCS", tenTruong, khuVuc: "BC", coSo: "", phongMay: "PM1", mbps, thoiGian: 1, maTinNhan: "m" });
    const rows = buildInternetSpeedRows([e("A1", 50), e("B1", null), e("C2", 8), e("D1", 0), e("C1", 3), e("B2", 12)], "2026-10-07");
    assert.deepEqual(rows.map((r) => [r.C, r.G ?? ""]), [["D1", "D"], ["C1", "C"], ["C2", "C"], ["B2", "B"], ["A1", "A"], ["B1", ""]]);
    assert.deepEqual(rows.map((r) => r.A), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(rows[0], { A: 1, B: "II", C: "D1", D: "BC", E: "PM1", H: "'07/10/2026", G: "D" }, "D has no speed");
    assert.equal(rows[1].F, 3);
    assert.equal("F" in rows[5], false, "no speed, no cell");
    for (const r of rows) assert.equal("I" in r, false, "GHI CHÚ stays blank");
});

test("the header date is a real date shown dd/mm/yyyy", () => {
    assert.deepEqual(internetSpeedHeaderCells("2026-10-07"), [{ ref: "I2", value: 46302, numberFormat: "dd/mm/yyyy" }]);
    assert.equal(INTERNET_SPEED_LAYOUT.legend, undefined, "the template's own filter-aware legend formulas are kept");
});

const REAL = path.join("data", "mau bao cao new", INTERNET_SPEED_LAYOUT.templateFile);
test("the real template still has the headers the layout relies on", { skip: !fs.existsSync(REAL) }, async () => {
    const { default: XLSX } = await import("xlsx");
    const ws = XLSX.readFile(REAL).Sheets[INTERNET_SPEED_LAYOUT.sheet];
    assert.deepEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I"].map((c) => String(ws[`${c}3`]?.v).trim()), ["STT", "CẤP", "TÊN TRƯỜNG", "KHU VỰC", "PM", "TỐC ĐỘ", "XẾP LOẠI", "NGÀY CẬP NHẬT", "GHI CHÚ"]);
    assert.equal(ws["A11"]?.v, "TỔNG");
    assert.match(String(ws["A1"]?.v), /TRẠNG THÁI KẾT NỐI INTERNET/);
});

// ---- trên đĩa: gắn lần đo vào tin báo cáo, người xem sửa, và chu trình đọc ----

test("parseSpeedText: 'Mb' viết thường là bit (45Mb thành 45), 'MB' hoa vẫn là byte nên không đổi", () => {
    assert.equal(parseSpeedText("45Mb"), 45);
    assert.equal(parseSpeedText("45 Mb"), 45);
    assert.equal(parseSpeedText("500 Kb"), 0.5);
    assert.equal(parseSpeedText("45MB"), null);
    assert.equal(parseSpeedText("45 MB"), null);
});
