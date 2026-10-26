import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyTechTitle, parseClockFraction, parseCutoff, parseTechRow, techRowsInWindow } from "../src/lesson/techReport.js";
import { classifyTitle } from "../src/lesson/parseReport.js";
import { classifyAttendanceTitle } from "../src/lesson/attendanceReport.js";
import type { SourceMessage } from "../src/types/index.js";

// Mẫu form IT (sheet "MỚI (2)" trong 01 - MAU BAO CAO KY THUAT.xlsx, cột D).
const ROLL_START = `ĐIỂM DANH ĐẦU BUỔI
- Cấp: I
- Tên Trường: TH LƯƠNG THẾ VINH
- Phân hiệu:
- Phường / Xã: THỦ ĐỨC
- Tổng số IT: 3
- Tên IT, CTV: Minh Phú
- Thực tập IT: Văn Long, Minh Tuấn
- Nhân viên vắng: 0`;
const ROLL_END = ROLL_START.replace("ĐẦU BUỔI", "CUỐI BUỔI");
const SHIFT_START = `CÔNG VIỆC ĐẦU CA LÀM
- Cấp: I
- Tên Trường: TH LƯƠNG THẾ VINH
- Phân hiệu:
- Phường / Xã: THỦ ĐỨC
- Trưởng nhóm IT: Minh Phú
- Bắt đầu giờ làm: 9:00
- Phòng máy trường: PM1
- Phòng máy công ty: PM2, PM3, PM4
- Phòng máy làm việc: PM2
- Công việc thực hiện: Bảo trì, thay thế linh kiện`;
const SHIFT_END = `CÔNG VIỆC CUỐI CA LÀM
- Cấp: I
- Tên Trường: TH LƯƠNG THẾ VINH
- Phân hiệu:
- Phường / Xã: THỦ ĐỨC
- Trưởng nhóm IT: Minh Phú
- Kết thúc giờ làm: 11:30
- Phòng máy làm việc: PM2
- Công việc hoàn thành:
 + Tổng số máy: 51
 + Số máy hoạt động: 50
 + Số máy còn lỗi: 1
 + HĐH Windows: Windows 10 pro miễn phí
 + Phần mềm MS Office: 2019 miễn phí
 + Tình trạng Netsupport: T
 + Tình trạng âm thanh: T
 + Tốc độ Internet: 90 mbps
 + Hiện trạng máy lạnh: 1 Media tốt, 1 sumikura yếu
 + Camera hỗ trợ: 1 hoạt động
 + Vệ sinh phòng máy: S
 + Hoàn thiện bảo trì: Đ
 + Hình ảnh phòng máy: Đ
 + Ý kiến bổ sung:
      Đã sửa chữa tối đa máy lỗi`;

const vn = (hour: number, minute: number, day = 22): number => Date.UTC(2026, 9, day, hour - 7, minute);
const msg = (content: string, ts: number, msgId = String(ts)): SourceMessage => ({ msgId, groupId: "g", groupName: "G", senderId: "s", ts, msgType: "desktop.text", content });

test("classifyTechTitle nhận đúng 4 tiêu đề, khớp nguyên dòng đầu", () => {
    assert.equal(classifyTechTitle(ROLL_START), "attendanceStart");
    assert.equal(classifyTechTitle(ROLL_END), "attendanceEnd");
    assert.equal(classifyTechTitle(SHIFT_START), "shiftStart");
    assert.equal(classifyTechTitle(SHIFT_END), "shiftEnd");
    assert.equal(classifyTechTitle("công việc đầu ca làm"), "shiftStart");
    assert.equal(classifyTechTitle("BÁO CÁO CUỐI BUỔI"), null);
    assert.equal(classifyTechTitle('"CÔNG VIỆC CUỐI CA LÀM\n- Tên Trường: X"'), "shiftEnd", "tin chép kèm dấu ngoặc kép");
    assert.equal(classifyTechTitle("*ĐIỂM DANH ĐẦU BUỔI*:\n- Tên Trường: X"), "attendanceStart");
    assert.equal(classifyTechTitle("CÔNG VIỆC CUỐI CA LÀM (sửa)\n- Tên Trường: X"), null);
    assert.equal(classifyTechTitle(""), null);
});

test("tin điểm danh cuối buổi và công việc đầu ca không bị báo cáo buổi dạy của trường nhận nhầm", () => {
    for (const text of [ROLL_END, SHIFT_START, SHIFT_END, ROLL_START]) assert.equal(classifyTitle(text), null);
    assert.equal(classifyAttendanceTitle(ROLL_END), false);
});

test("parseClockFraction: 9:00, 09h30, 11h; giờ sai hoặc chữ thì null", () => {
    assert.equal(parseClockFraction("9:00"), 0.375);
    assert.equal(parseClockFraction("09h30"), 570 / 1440);
    assert.equal(parseClockFraction("11h"), 660 / 1440);
    assert.equal(parseClockFraction("25:00"), null);
    assert.equal(parseClockFraction(""), null);
    assert.equal(parseClockFraction("sau giờ trưa"), null);
});

test("parseCutoff đổi HH:MM sang phút trong ngày", () => {
    assert.equal(parseCutoff("08:30"), 510);
    assert.equal(parseCutoff("9:00"), 540);
    assert.throws(() => parseCutoff("24:00"));
    assert.throws(() => parseCutoff("abc"));
});

test("điểm danh đầu/cuối buổi: form không có dòng giờ thì THỜI GIAN là giờ gửi tin, thực tập mỗi tên một dòng", () => {
    const expected = { B: "I", C: "TH LƯƠNG THẾ VINH", D: null, E: "THỦ ĐỨC", F: 485 / 1440, G: 3, H: "Minh Phú", I: "- Văn Long\n- Minh Tuấn", J: 0 };
    assert.deepEqual(parseTechRow("attendanceStart", ROLL_START, vn(8, 5)), expected);
    assert.deepEqual(parseTechRow("attendanceEnd", ROLL_END, vn(8, 5)), expected);
});

test("điểm danh: dòng Thời gian của form ưu tiên hơn giờ gửi; ghi chữ không đọc được thì quay về giờ gửi", () => {
    const withTime = ROLL_START.replace("- Phường / Xã: THỦ ĐỨC", "- Phường / Xã: THỦ ĐỨC\n- Thời gian: 8:00");
    assert.equal(parseTechRow("attendanceStart", withTime, vn(11, 12))?.F, 480 / 1440);
    assert.equal(parseTechRow("attendanceEnd", withTime.replace("8:00", "12:00").replace("ĐẦU", "CUỐI"), vn(11, 13))?.F, 720 / 1440);
    assert.equal(parseTechRow("attendanceStart", withTime.replace("8:00", "sáng"), vn(11, 12))?.F, 672 / 1440);
});

test("điểm danh: không thực tập thì TT IT trống; thiếu Tên Trường thì không ra dòng", () => {
    const row = parseTechRow("attendanceStart", ROLL_START.replace("Văn Long, Minh Tuấn", "0").replace("Nhân viên vắng: 0", "Nhân viên vắng: An"), vn(8, 0));
    assert.equal(row?.I, null);
    assert.equal(row?.J, "An");
    assert.equal(parseTechRow("attendanceStart", ROLL_START.replace("TH LƯƠNG THẾ VINH", ""), vn(8, 0)), null);
});

test("công việc đầu ca: giờ ghi trong tin, phòng máy đổi sang số", () => {
    assert.deepEqual(parseTechRow("shiftStart", SHIFT_START, vn(8, 40)), {
        B: "I", C: "TH LƯƠNG THẾ VINH", D: null, E: "THỦ ĐỨC", F: "Minh Phú", G: 0.375, H: 1, I: "2, 3, 4", J: 2, K: "Bảo trì, thay thế linh kiện",
    });
});

test("công việc đầu ca: dòng công việc nhiều dòng được nối lại, giờ không đọc được thì trống", () => {
    const text = SHIFT_START.replace("9:00", "sáng").replace("Công việc thực hiện: Bảo trì, thay thế linh kiện", "Công việc thực hiện:\n- Bảo trì\n- Thay RAM");
    const row = parseTechRow("shiftStart", text, vn(8, 40));
    assert.equal(row?.G, null);
    assert.equal(row?.K, "Bảo trì\nThay RAM");
});

test("công việc cuối ca: chép nguyên văn, chỉ phòng máy, tốc độ, máy lạnh và camera được chuẩn hoá theo mẫu", () => {
    assert.deepEqual(parseTechRow("shiftEnd", SHIFT_END, vn(11, 40)), {
        B: "I", C: "TH LƯƠNG THẾ VINH", D: null, E: "THỦ ĐỨC", F: "Minh Phú", G: 690 / 1440,
        H: 2, I: 51, J: 50, K: 1,
        L: "Windows 10 pro miễn phí", M: "2019 miễn phí", N: "T", O: "T", P: 90,
        Q: "- 1 Media tốt\n- 1 sumikura yếu", R: 1, S: "S", T: "Đ", U: "Đ",
    });
});

test("công việc cuối ca: tốc độ kbps đổi sang Mbps, chữ không có số thì trống, dòng để trống là 0", () => {
    assert.equal(parseTechRow("shiftEnd", SHIFT_END.replace("90 mbps", "500 kbps"), vn(11, 0))?.P, 0.5);
    assert.equal(parseTechRow("shiftEnd", SHIFT_END.replace("90 mbps", "Không có mạng"), vn(11, 0))?.P, null);
    assert.equal(parseTechRow("shiftEnd", SHIFT_END.replace("Tốc độ Internet: 90 mbps", "Tốc độ Internet:"), vn(11, 0))?.P, 0);
    assert.equal(parseTechRow("shiftEnd", SHIFT_END.replace("1 hoạt động", "Không có"), vn(11, 0))?.R, "Không có");
});

test("techRowsInWindow: chỉ tin đúng loại, cùng ngày, tới hết phút mốc; mỗi tin một dòng, xếp theo giờ gửi, STT từ 1", () => {
    const cutoff = parseCutoff("08:30");
    const messages = [
        msg(ROLL_START, vn(8, 31), "late"),
        msg(ROLL_START.replace("THỦ ĐỨC", "Q1"), vn(8, 30), "edge"),
        msg(ROLL_START, vn(7, 59), "early"),
        msg(ROLL_START, vn(8, 0, 21), "yesterday"),
        msg(ROLL_END, vn(8, 0), "other-kind"),
        msg("xin chào", vn(8, 0), "chat"),
    ];
    const rows = techRowsInWindow(messages, "attendanceStart", "2026-10-22", cutoff);
    assert.deepEqual(rows.map((r) => [r.A, r.E]), [[1, "THỦ ĐỨC"], [2, "Q1"]]);
});

test("techRowsInWindow: tin ảnh/không phải văn bản bị bỏ", () => {
    const m = { ...msg(ROLL_START, vn(8, 0)), msgType: "desktop.photo" };
    assert.equal(techRowsInWindow([m], "attendanceStart", "2026-10-22", 510).length, 0);
});

test("giờ viết '9g30' và số kèm đơn vị đếm ('51 máy') được đọc như '9h30' và 51", () => {
    assert.equal(parseClockFraction("9g30"), (9 * 60 + 30) / 1440);
    assert.equal(parseClockFraction("11G"), 11 / 24);
    const row = parseTechRow("shiftEnd", ["CÔNG VIỆC CUỐI CA LÀM", "- Tên Trường: A", "- Kết thúc giờ làm: 11g30", " + Tổng số máy: 51 máy", " + Số máy hoạt động: 50", " + Số máy còn lỗi: 1 máy", " + Tốc độ Internet: 45Mb"].join("\n"), 0);
    assert.equal(row?.G, (11 * 60 + 30) / 1440);
    assert.equal(row?.I, 51);
    assert.equal(row?.K, 1);
    assert.equal(row?.P, 45);
    const att = parseTechRow("attendanceStart", ["ĐIỂM DANH ĐẦU BUỔI", "- Tên Trường: A", "- Tổng số IT: 3 người", "- Nhân viên vắng: 2 người"].join("\n"), 0);
    assert.equal(att?.G, 3);
    assert.equal(att?.J, 2);
    assert.equal(parseTechRow("shiftEnd", "CÔNG VIỆC CUỐI CA LÀM\n- Tên Trường: A\n + Tổng số máy: nhiều", 0)?.I, "nhiều", "chữ không phải số giữ nguyên");
});
