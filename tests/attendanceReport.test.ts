import { test } from "node:test";
import assert from "node:assert/strict";
import { attendanceSessionOf, classifyAttendanceTitle, isLateAttendance, isRecordedAttendance, parseAttendanceMessage } from "../src/lesson/attendanceReport.js";

// Mẫu form IT mới (sheet "MỚI (2)" trong 01 - MAU BAO CAO KY THUAT.xlsx, ô D3).
const ROLL_CALL = `ĐIỂM DANH ĐẦU BUỔI
- Cấp: I
- Tên Trường: TH LƯƠNG THẾ VINH
- Phân hiệu:
- Phường / Xã: THỦ ĐỨC
- Tổng số IT: 3
- Tên IT, CTV: Minh Phú
- Thực tập IT: Văn Long, Minh Tuấn
- Nhân viên vắng: 0`;

test("classifyAttendanceTitle chỉ nhận ĐIỂM DANH ĐẦU BUỔI (không nhận điểm danh cuối buổi, báo cáo cũ)", () => {
    assert.equal(classifyAttendanceTitle(ROLL_CALL), true);
    assert.equal(classifyAttendanceTitle("điểm danh đầu buổi"), true);
    assert.equal(classifyAttendanceTitle("ĐIỂM DANH CUỐI BUỔI\n- Tên Trường: X"), false);
    assert.equal(classifyAttendanceTitle("BÁO CÁO ĐIỂM DANH\n- Tên NV IT thực tập: A"), false);
    assert.equal(classifyAttendanceTitle("BÁO CÁO CUỐI BUỔI"), false);
    assert.equal(classifyAttendanceTitle(""), false);
});

// Giờ để tính trễ/khung sáng-chiều và giờ hiển thị ở cột SÁNG/CHIỀU lấy đúng giờ Zalo GHI NHẬN tin gửi tới (msg.ts):
// form mới không có dòng giờ nào. Tên trường vào cột VỊ TRÍ; "Tên IT, CTV" và "Nhân viên vắng" chưa vào file.
test("parseAttendanceMessage: mỗi tên trong 'Thực tập IT' một người, vị trí là 'Tên Trường'", () => {
    assert.deepEqual(parseAttendanceMessage(ROLL_CALL), [
        { tenNV: "Văn Long", noiLamViec: "TH LƯƠNG THẾ VINH" },
        { tenNV: "Minh Tuấn", noiLamViec: "TH LƯƠNG THẾ VINH" },
    ]);
});

test("parseAttendanceMessage: một thực tập, dấu phẩy thừa và khoảng trắng thừa", () => {
    assert.deepEqual(parseAttendanceMessage(ROLL_CALL.replace("Văn Long, Minh Tuấn", " Văn Long ")), [{ tenNV: "Văn Long", noiLamViec: "TH LƯƠNG THẾ VINH" }]);
    assert.deepEqual(parseAttendanceMessage(ROLL_CALL.replace("Văn Long, Minh Tuấn", "Văn Long,, Minh Tuấn, ")).map((r) => r.tenNV), ["Văn Long", "Minh Tuấn"]);
});

test("parseAttendanceMessage: thiếu Tên Trường hoặc không có thực tập (trống, 0, không) -> không ra ai", () => {
    assert.deepEqual(parseAttendanceMessage(ROLL_CALL.replace("- Tên Trường: TH LƯƠNG THẾ VINH\n", "")), []);
    assert.deepEqual(parseAttendanceMessage(ROLL_CALL.replace("- Tên Trường: TH LƯƠNG THẾ VINH", "- Tên Trường:")), []);
    for (const v of ["", "0", "Không", "không"]) {
        assert.deepEqual(parseAttendanceMessage(ROLL_CALL.replace("Văn Long, Minh Tuấn", v)), []);
    }
});

test("parseAttendanceMessage: 'Tên IT, CTV' không bị lẫn vào danh sách thực tập", () => {
    assert.deepEqual(parseAttendanceMessage(ROLL_CALL).map((r) => r.tenNV).includes("Minh Phú"), false);
});

test("attendanceSessionOf: giờ < 12 là sáng, >= 12 là chiều", () => {
    assert.equal(attendanceSessionOf(8), "morning");
    assert.equal(attendanceSessionOf(11), "morning");
    assert.equal(attendanceSessionOf(12), "afternoon");
    assert.equal(attendanceSessionOf(17), "afternoon");
});

test("isLateAttendance: trễ = QUA 8h05 (sáng) hoặc QUA 14h05 (chiều), đúng 8h05/14h05 chưa tính; chiều chỉ ghi nhận tới hết 17h30", () => {
    assert.equal(isLateAttendance("morning", 8, 5), false);
    assert.equal(isLateAttendance("morning", 8, 6), true);
    assert.equal(isLateAttendance("morning", 8, 0), false);
    assert.equal(isLateAttendance("morning", 7, 59), false);
    assert.equal(isLateAttendance("morning", 11, 59), true);
    assert.equal(isLateAttendance("afternoon", 14, 5), false);
    assert.equal(isLateAttendance("afternoon", 14, 6), true);
    assert.equal(isLateAttendance("afternoon", 13, 59), false);
    assert.equal(isLateAttendance("afternoon", 17, 30), true);
    assert.equal(isLateAttendance("afternoon", 17, 31), false);
    assert.equal(isLateAttendance("afternoon", 18, 0), false);
});

test("isRecordedAttendance: tin điểm danh gửi quá 17h30 không còn được ghi nhận", () => {
    assert.equal(isRecordedAttendance(17, 30), true);
    assert.equal(isRecordedAttendance(17, 31), false);
    assert.equal(isRecordedAttendance(23, 0), false);
    assert.equal(isRecordedAttendance(6, 0), true);
});
