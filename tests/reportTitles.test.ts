import { test } from "node:test";
import assert from "node:assert/strict";
import { MESSAGE_TITLES, REPORT_LABELS } from "../src/constants/reportTitles.js";
import { REPORT_DEFS, REPORT_KEYS } from "../src/reportSets/registry.js";
import { fold, foldTitle } from "../src/lesson/parseReport.js";
import { classifyTechTitle } from "../src/lesson/techReport.js";
import { classifyCleaningTitle, classifyEndOfShiftTitle } from "../src/lesson/cleaningReport.js";
import { classifyAttendanceTitle } from "../src/lesson/attendanceReport.js";
import { classifyElectricTitle } from "../src/lesson/electricReport.js";

test("tiêu đề tin gấp ra đúng khóa so khớp cũ (Đ thành d)", () => {
    assert.equal(foldTitle(MESSAGE_TITLES.attendanceStart), "diem danh dau buoi");
    assert.equal(foldTitle(MESSAGE_TITLES.attendanceEnd), "diem danh cuoi buoi");
    assert.equal(foldTitle(MESSAGE_TITLES.shiftStart), "cong viec dau ca lam");
    assert.equal(foldTitle(MESSAGE_TITLES.shiftEnd), "cong viec cuoi ca lam");
    assert.equal(fold(MESSAGE_TITLES.electric), "loi dien");
    assert.equal(fold(MESSAGE_TITLES.legacyEndOfSession), "bao cao cuoi buoi");
});

test("các hàm nhận diện nhận đúng tiêu đề từ hằng số", () => {
    assert.equal(classifyTechTitle(`${MESSAGE_TITLES.shiftStart}\n- Tên Trường: A`), "shiftStart");
    assert.equal(classifyTechTitle(`"${MESSAGE_TITLES.attendanceEnd}`), "attendanceEnd");
    assert.equal(classifyEndOfShiftTitle(MESSAGE_TITLES.shiftEnd), true);
    assert.equal(classifyEndOfShiftTitle(MESSAGE_TITLES.shiftStart), false);
    assert.equal(classifyAttendanceTitle(MESSAGE_TITLES.attendanceStart), true);
    assert.equal(classifyAttendanceTitle(MESSAGE_TITLES.attendanceEnd), false);
    assert.equal(classifyElectricTitle(MESSAGE_TITLES.electric), true);
    assert.equal(classifyCleaningTitle(MESSAGE_TITLES.legacyEndOfSession), true);
});

test("mỗi mã báo cáo có nhãn, và registry dùng đúng nhãn đó", () => {
    for (const key of REPORT_KEYS) {
        assert.ok(REPORT_LABELS[key], key);
        assert.equal(REPORT_DEFS[key].label, REPORT_LABELS[key]);
    }
});
