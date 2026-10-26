import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyCleaningTitle, classifyEndOfShiftTitle, cleaningReportDay, parseCleaningMessage } from "../src/lesson/cleaningReport.js";

test("classifyCleaningTitle only matches the exact title, not the school-report one", () => {
    assert.equal(classifyCleaningTitle("BÁO CÁO CUỐI BUỔI\n- Tên trường: X"), true);
    assert.equal(classifyCleaningTitle("báo cáo cuối buổi"), true);
    assert.equal(classifyCleaningTitle("BÁO CÁO CUỐI BUỔI DẠY\n- Tên Giáo Viên: A"), false);
    assert.equal(classifyCleaningTitle("BÁO CÁO ĐẦU BUỔI"), false);
    assert.equal(classifyCleaningTitle(""), false);
});

test("cleaningReportDay: TẠM THỜI lấy đúng ngày hôm nay (không lùi ngày), theo giờ Việt Nam", () => {
    assert.equal(cleaningReportDay(Date.UTC(2026, 8, 30, 3, 0)), "2026-09-30"); // 10:00 Thứ 4
    assert.equal(cleaningReportDay(Date.UTC(2026, 9, 5, 3, 0)), "2026-10-05"); // Thứ 2 cũng lấy chính ngày đó, không lùi về Thứ 7
    assert.equal(cleaningReportDay(Date.UTC(2026, 8, 30, 16, 59)), "2026-09-30"); // 23:59 VN vẫn là ngày 30
    assert.equal(cleaningReportDay(Date.UTC(2026, 8, 30, 17, 0)), "2026-10-01"); // 00:00 VN sang ngày 1/10
});

// Mẫu form IT mới (sheet "MỚI (2)" trong 01 - MAU BAO CAO KY THUAT.xlsx, ô D5).
const END_OF_SHIFT = `CÔNG VIỆC CUỐI CA LÀM
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
 + Tình trạng Netsupport: T
 + Tốc độ Internet: 90 mbps
 + Vệ sinh phòng máy: S
 + Hoàn thiện bảo trì: Đ
 + Hình ảnh phòng máy: Đ
 + Ý kiến bổ sung:
      Đã sửa chữa tối đa máy lỗi`;

test("classifyEndOfShiftTitle chỉ nhận tin CÔNG VIỆC CUỐI CA LÀM, không nhận tin đầu ca hay báo cáo cuối buổi", () => {
    assert.equal(classifyEndOfShiftTitle(END_OF_SHIFT), true);
    assert.equal(classifyEndOfShiftTitle("công việc cuối ca làm\n- Tên Trường: X"), true);
    assert.equal(classifyEndOfShiftTitle("CÔNG VIỆC ĐẦU CA LÀM\n- Tên Trường: X"), false);
    assert.equal(classifyEndOfShiftTitle("BÁO CÁO CUỐI BUỔI\n- Tên trường: X"), false);
    assert.equal(classifyEndOfShiftTitle(""), false);
});

test("parseCleaningMessage đọc tin CÔNG VIỆC CUỐI CA LÀM: trường, phường/xã, phòng máy làm việc, trưởng nhóm IT", () => {
    assert.deepEqual(parseCleaningMessage(END_OF_SHIFT), [
        { tenTruong: "TH LƯƠNG THẾ VINH", khuVuc: "THỦ ĐỨC", phongMay: "PM2", tenIT: "Minh Phú" },
    ]);
});

test("parseCleaningMessage: khu vực giữ đúng như tin ghi (TĐ vẫn là TĐ), 'Phường/Xã' viết liền cũng nhận", () => {
    const msg = END_OF_SHIFT.replace(/Phường \/ Xã:.*/, "Phường/Xã: TĐ ");
    assert.equal(parseCleaningMessage(msg)[0].khuVuc, "TĐ");
});

test("parseCleaningMessage: dòng 'Vệ sinh phòng máy: S/C' không ảnh hưởng gì (bot không lấy)", () => {
    for (const v of ["R", "C", "S", ""]) {
        assert.deepEqual(parseCleaningMessage(END_OF_SHIFT.replace("Vệ sinh phòng máy: S", `Vệ sinh phòng máy: ${v}`)), parseCleaningMessage(END_OF_SHIFT));
    }
});

test("parseCleaningMessage: thiếu 'Phường / Xã' hoặc 'Phòng máy làm việc' vẫn ra dòng với ô trống; thiếu 'Tên Trường' thì bỏ", () => {
    const noArea = END_OF_SHIFT.replace(/- Phường \/ Xã:.*\n/, "");
    assert.deepEqual(parseCleaningMessage(noArea), [{ tenTruong: "TH LƯƠNG THẾ VINH", khuVuc: "", phongMay: "PM2", tenIT: "Minh Phú" }]);
    const noRoom = END_OF_SHIFT.replace("- Phòng máy làm việc: PM2\n", "");
    assert.equal(parseCleaningMessage(noRoom)[0].phongMay, "");
    assert.deepEqual(parseCleaningMessage(END_OF_SHIFT.replace("- Tên Trường: TH LƯƠNG THẾ VINH\n", "")), []);
    assert.deepEqual(parseCleaningMessage(END_OF_SHIFT.replace("- Tên Trường: TH LƯƠNG THẾ VINH\n", "- Tên Trường:\n")), []);
});
