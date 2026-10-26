import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { capFromLine, coSoFromLine, maintenanceEntries, parseMaintenanceMessage } from "../src/lesson/maintenanceReport.js";
import { buildMaintenanceRows, capLaMa, MAINTENANCE_LAYOUT, maintenanceHeaderCells } from "../src/lesson/maintenanceRows.js";
import { legendFormulaCells } from "../src/lesson/statusReportLayout.js";
import type { SourceMessage } from "../src/types/index.js";

/** Tin CÔNG VIỆC CUỐI CA LÀM theo form IT mới (sheet "MỚI (2)"). */
const REPORT = (school: string, area = "", over: { cap?: string; phanHieu?: string; room?: string; tocDo?: string | null } = {}): string =>
    [
        "CÔNG VIỆC CUỐI CA LÀM",
        `- Cấp: ${over.cap ?? ""}`,
        `- Tên Trường: ${school}`,
        `- Phân hiệu: ${over.phanHieu ?? ""}`,
        `- Phường / Xã: ${area}`,
        "- Trưởng nhóm IT: Minh Phú",
        "- Kết thúc giờ làm: 11:30",
        `- Phòng máy làm việc: ${over.room ?? "PM1"}`,
        "- Công việc hoàn thành:",
        " + Tổng số máy: 51",
        ...(over.tocDo === null ? [] : [` + Tốc độ Internet: ${over.tocDo ?? "90 mbps"}`]),
        " + Vệ sinh phòng máy: S",
        " + Hoàn thiện bảo trì: Đ",
    ].join("\n");
const msg = (content: string, ts: number, id = String(ts)): SourceMessage => ({ msgId: id, groupId: "g1", groupName: "bot test", threadType: "group", senderId: "u", senderName: "IT", isSelf: false, ts, msgType: "desktop.text", content } as SourceMessage);
const all = () => true;

test("a CÔNG VIỆC CUỐI CA LÀM message gives the school level, the school name and the area exactly as written", () => {
    assert.deepEqual(parseMaintenanceMessage(REPORT("THCS Vĩnh Lộc B", "BC")), { cap: "THCS", tenTruong: "VĨNH LỘC B", khuVuc: "BC", coSo: "" });
    assert.deepEqual(parseMaintenanceMessage(REPORT("TH LƯƠNG THẾ VINH", "THỦ ĐỨC", { cap: "I" })), { cap: "TH", tenTruong: "LƯƠNG THẾ VINH", khuVuc: "THỦ ĐỨC", coSo: "" });
    assert.equal(parseMaintenanceMessage(REPORT("TH Tây Bắc Lân", " hm "))?.khuVuc, "HM", "trimmed and upper-cased");
});

test("a school with no level in its name takes it from the Cấp line (I, II, III or letters); a prefix in the name wins", () => {
    assert.deepEqual(parseMaintenanceMessage(REPORT("Đồng Xanh", "Q5", { cap: "LC" })), { cap: "LC", tenTruong: "ĐỒNG XANH", khuVuc: "Q5", coSo: "" });
    assert.equal(parseMaintenanceMessage(REPORT("Lương Thế Vinh", "TĐ", { cap: "I" }))?.cap, "TH");
    assert.equal(parseMaintenanceMessage(REPORT("Nguyễn Du", "Q1", { cap: "ii" }))?.cap, "THCS");
    assert.equal(parseMaintenanceMessage(REPORT("THPT Nguyễn Hữu Cảnh", "BC", { cap: "I" }))?.cap, "THPT", "the name's prefix wins over the Cấp line");
    assert.deepEqual(parseMaintenanceMessage(REPORT("Trường Lạ")), { cap: "", tenTruong: "TRƯỜNG LẠ", khuVuc: "", coSo: "" });
});

test("the campus comes from Phân hiệu (CS1, cs 1, Cơ sở 1, 1) or from the end of the name", () => {
    for (const ph of ["CS1", "cs 1", "Cơ sở 1", "1"]) assert.equal(parseMaintenanceMessage(REPORT("TH Bình Trị 2", "BTAN", { phanHieu: ph }))?.coSo, "CS1", ph);
    const inName = parseMaintenanceMessage(REPORT("TH BÌNH TRỊ 2 CS2", "BTAN"));
    assert.deepEqual([inName?.tenTruong, inName?.coSo], ["BÌNH TRỊ 2", "CS2"]);
    assert.equal(parseMaintenanceMessage(REPORT("TH Bình Trị 2", "BTAN", { phanHieu: "Tân Phú" }))?.coSo, "TÂN PHÚ", "other text is kept as written");
    assert.equal(coSoFromLine(""), "");
    assert.equal(capFromLine(" iii "), "THPT");
});

test("an old-style ' - Q6' ending of the name is the area only when Phường / Xã is empty; a mixed-level name is not split", () => {
    assert.deepEqual(parseMaintenanceMessage(REPORT("TH Kim Đồng - Q6")), { cap: "TH", tenTruong: "KIM ĐỒNG", khuVuc: "Q6", coSo: "" });
    assert.deepEqual(parseMaintenanceMessage(REPORT("TH Kim Đồng - Q6", "GV")), { cap: "TH", tenTruong: "KIM ĐỒNG", khuVuc: "GV", coSo: "" }, "Phường / Xã wins");
    const mixed = parseMaintenanceMessage(REPORT("THCS - THPT Nguyễn Khuyến", "BTAN"));
    assert.deepEqual([mixed?.cap, mixed?.tenTruong, mixed?.khuVuc], ["THCS - THPT", "NGUYỄN KHUYẾN", "BTAN"]);
});

test("other titles, and a message without a school line, are not maintenance rows", () => {
    assert.equal(parseMaintenanceMessage("BÁO CÁO CUỐI BUỔI\n- Tên trường: THCS A - BC\n* Phòng máy: PM1\n- Internet: Có"), null, "the old form is no longer read");
    assert.equal(parseMaintenanceMessage("BÁO CÁO CUỐI BUỔI DẠY\n- Tên trường: THCS A - BC"), null, "teaching report is a different report");
    assert.equal(parseMaintenanceMessage(REPORT("THCS A", "BC").replace("CUỐI CA", "ĐẦU CA")), null, "start of shift is not read");
    assert.equal(parseMaintenanceMessage("ĐIỂM DANH ĐẦU BUỔI\n- Tên Trường: THCS A"), null);
    assert.equal(parseMaintenanceMessage(REPORT("THCS A", "BC").replace("- Tên Trường: THCS A\n", "")), null);
    assert.equal(parseMaintenanceMessage(REPORT("  ", "BC")), null);
});

test("one row per school and campus: several rooms or several reports give one entry, the earliest message wins, order is send order", () => {
    const entries = maintenanceEntries(
        [msg(REPORT("THCS Vĩnh Lộc B", "BC", { room: "PM2" }), 3000, "late"), msg(REPORT("TH Tây Bắc Lân", "HM"), 2000), msg(REPORT("thcs  vĩnh lộc b", "bc", { room: "PM1" }), 1000, "early"), msg("lời chào", 500)],
        all,
    );
    assert.deepEqual(entries.map((e) => [e.tenTruong, e.khuVuc, e.maTinNhan]), [["VĨNH LỘC B", "BC", "early"], ["TÂY BẮC LÂN", "HM", "2000"]]);
});

test("the same school name in two areas, or two campuses, are separate rows, and the time filter is applied", () => {
    const messages = [msg(REPORT("THCS An Phú", "BC"), 1000), msg(REPORT("THCS An Phú", "HM"), 2000), msg(REPORT("THCS Cũ", "BC"), 100)];
    assert.equal(maintenanceEntries(messages, all).length, 3);
    assert.deepEqual(maintenanceEntries(messages, (ts) => ts >= 1000).map((e) => e.khuVuc), ["BC", "HM"]);
    const campuses = maintenanceEntries([msg(REPORT("TH Bình Trị 2", "BTAN", { phanHieu: "CS1" }), 1000), msg(REPORT("TH Bình Trị 2", "BTAN", { phanHieu: "CS2" }), 2000)], all);
    assert.deepEqual(campuses.map((e) => e.coSo), ["CS1", "CS2"]);
});

test("rows fill STT, CẤP, TÊN TRƯỜNG, KHU VỰC and the report date; every other column stays blank", () => {
    const rows = buildMaintenanceRows(maintenanceEntries([msg(REPORT("THCS Vĩnh Lộc B", "BC"), 1000), msg(REPORT("TH Tây Bắc Lân", "HM"), 2000)], all), "2026-10-07");
    assert.deepEqual(rows, [
        { A: 1, B: "II", C: "VĨNH LỘC B", D: "BC", H: "'07/10/2026" },
        { A: 2, B: "I", C: "TÂY BẮC LÂN", D: "HM", H: "'07/10/2026" },
    ]);
    for (const row of rows) for (const blank of ["E", "F", "G", "I", "J", "K", "L"]) assert.equal(blank in row, false, blank);
});

test("the level column is a Roman numeral for the three public levels and untouched for any other", () => {
    assert.deepEqual(["TH", "THCS", "THPT"].map(capLaMa), ["I", "II", "III"]);
    assert.deepEqual(["MN", "LC", "THCS - THPT", "TH - THCS", "CĐ", ""].map(capLaMa), ["MN", "LC", "THCS - THPT", "TH - THCS", "CĐ", ""]);
    const rows = buildMaintenanceRows(maintenanceEntries([msg(REPORT("THPT Nguyễn Hữu Cảnh", "BC"), 1000), msg(REPORT("MN Hoa Hồng", "BC"), 2000), msg(REPORT("Trường Lạ", "BC"), 3000)], all), "2026-10-07");
    assert.deepEqual(rows.map((r) => r.B), ["III", "MN", ""]);
});

test("the header date is a real date shown dd/mm/yyyy, and the legend counts the grade column J", () => {
    assert.deepEqual(maintenanceHeaderCells("2026-10-07"), [{ ref: "L2", value: 46302, numberFormat: "dd/mm/yyyy" }]);
    const legend = legendFormulaCells(MAINTENANCE_LAYOUT, 2);
    // Hai dòng dữ liệu (4-5) thì dòng TỔNG là 6 và khối chú giải dời lên: các dòng loại là 10-13, dòng TỔNG của khối là 14.
    const count = legend.find((c) => c.ref === "D10");
    assert.ok(count);
    assert.equal(count.formula, "COUNTIF(J4:J5,B10)", "grade rows follow the data block");
    assert.ok(legend.some((c) => c.ref === "E14"), "sum row of the ratio column");
});

const REAL = path.join("data", "mau bao cao new", MAINTENANCE_LAYOUT.templateFile);
test("the real template still has the headers the layout relies on", { skip: !fs.existsSync(REAL) }, () => {
    const ws = XLSX.readFile(REAL).Sheets[MAINTENANCE_LAYOUT.sheet];
    assert.ok(ws, "sheet FORM");
    const header = (cols: string[]) => cols.map((c) => ws[`${c}3`]?.v);
    assert.deepEqual(header(["A", "B", "C", "D", "H", "I", "J"]), ["STT", "CẤP", "TÊN TRƯỜNG", "KHU VỰC", "BẢO TRÌ GN", "SỐ NGÀY", "XẾP LOẠI"]);
    assert.equal(ws["A10"]?.v, "TỔNG");
    assert.equal(ws["B14"]?.v, "A");
    assert.equal(ws["B17"]?.v, "D");
    assert.match(String(ws["A1"]?.v), /THỜI GIAN CHƯA BẢO TRÌ/);
});
