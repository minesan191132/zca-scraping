import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    ELECTRIC_LABELS, GRADE_VALUES, IT_ATTENDANCE_LABELS, IT_SHIFT_END_LABELS, IT_SHIFT_START_LABELS, NONE_VALUES, SCHOOL_FORM_IGNORED_LABELS, SCHOOL_FORM_LABELS, SCHOOL_HEADER_LABELS, TITLE_ALIASES,
    type SpellingEntry,
} from "../src/constants/spellingAliases.js";
import { classifyTitle, parseGrade, parseLines } from "../src/lesson/parseReport.js";
import { classifyTechTitle, parseTechRow, type TechKey } from "../src/lesson/techReport.js";
import { classifyEndOfShiftTitle, parseEndOfShift } from "../src/lesson/cleaningReport.js";
import { classifyAttendanceTitle, parseAttendanceMessage } from "../src/lesson/attendanceReport.js";
import { classifyElectricTitle, parseElectricMessage } from "../src/lesson/electricReport.js";
import { cleanSchoolName, itLevelValue, schoolNameMatchesGroup } from "../src/lesson/spelling.js";
import { extractAll } from "../src/lesson/extract.js";
import { at, DAY, msg, NEW_FORM_END } from "./fixtures.js";

const all = (e: SpellingEntry): string[] => [e.canonical, ...e.variants];

test("form trường: mỗi biến thể của nhãn rơi vào cùng khóa với dạng đúng", () => {
    for (const [field, e] of Object.entries({ ...SCHOOL_HEADER_LABELS, ...SCHOOL_FORM_LABELS })) {
        if (field === "cap") continue;
        for (const label of all(e)) {
            const { values } = parseLines(`BÁO CÁO CUỐI BUỔI\n- ${label}: giá trị`);
            assert.equal(values[field as keyof typeof values], "giá trị", `${field}: "${label}"`);
        }
    }
});

test("form trường: biến thể của dòng cố ý bỏ qua không thành nhãn lạ và không vào khóa nào", () => {
    for (const [field, e] of Object.entries({ cap: SCHOOL_HEADER_LABELS.cap, ...SCHOOL_FORM_IGNORED_LABELS })) {
        for (const label of all(e)) {
            const { values, unknownLabels } = parseLines(`BÁO CÁO CUỐI BUỔI\n- ${label}: giá trị`);
            assert.deepEqual(values, {}, `${field}: "${label}"`);
            assert.deepEqual(unknownLabels, [], `${field}: "${label}"`);
        }
    }
});

test('"Tổng số máy lỗi" không còn bị nuốt im lặng bởi dòng bỏ qua "tổng số máy..."', () => {
    assert.equal(parseLines("BÁO CÁO CUỐI BUỔI\n- Tổng số máy lỗi: 3").values.loi, "3");
    assert.equal(parseLines("BÁO CÁO CUỐI BUỔI\n- Tổng số máy hỏng: 2").values.loi, "2");
});

test("form trường: tin theo form hiện tại đọc y như trước (nhãn đúng không đi qua bảng)", () => {
    const { values, unknownLabels } = parseLines(NEW_FORM_END);
    assert.equal(values.tenTruong, "Sao Mai 1");
    assert.equal(values.phanHieu, "Chưa có thông tin");
    assert.deepEqual(unknownLabels, []);
});

test("tiêu đề form trường gõ sai chỉ được nhận khi tin có dòng giáo viên", () => {
    for (const t of TITLE_ALIASES.schoolStart.variants) assert.equal(classifyTitle(`${t}\n- Tên Giáo viên: A`), "DauBuoi", t);
    for (const t of TITLE_ALIASES.schoolEnd.variants) assert.equal(classifyTitle(`${t}\n- Tên Giáo viên: A`), "CuoiBuoi", t);
    assert.notEqual(classifyTitle("BÁO CÁO CUỐI BUỔ\n- Phòng máy: PM1"), "CuoiBuoi");
    assert.equal(classifyTitle('"BÁO CÁO CUỐI BUỔI\n- Tên GV: A'), "CuoiBuoi", "dấu ngoặc kép thừa đầu dòng và nhãn Tên GV");
});

test("xếp loại viết chữ về T/B/K; chữ khác giữ nguyên", () => {
    for (const [grade, e] of Object.entries(GRADE_VALUES)) for (const v of all(e)) assert.equal(parseGrade(v), grade, v);
    assert.equal(parseGrade("Ổn"), "Ổn");
    assert.equal(parseGrade(""), "");
    assert.equal(parseGrade(undefined), null);
});

const row = (key: TechKey, title: string, label: string, value: string): Record<string, unknown> | null =>
    parseTechRow(key, `${title}\n- Tên Trường: X\n- ${label}: ${value}`, 0);

test("form IT: mỗi biến thể rơi vào cùng ô với dạng đúng", () => {
    const groups: Array<[TechKey, Record<string, SpellingEntry>, string[]]> = [
        ["attendanceStart", { ...SCHOOL_HEADER_LABELS, ...IT_ATTENDANCE_LABELS }, ["cap", "phanHieu", "phuongXa", "thoiGian", "tongIT", "tenIT", "thucTap", "vang"]],
        ["shiftStart", { ...SCHOOL_HEADER_LABELS, ...IT_SHIFT_START_LABELS }, ["cap", "phanHieu", "phuongXa", "truongNhom", "batDau", "pmTruong", "pmCongTy", "pmLamViec", "congViec"]],
        ["shiftEnd", { ...SCHOOL_HEADER_LABELS, ...IT_SHIFT_END_LABELS }, ["cap", "phanHieu", "phuongXa", "truongNhom", "ketThuc", "pmLamViec", "tongMay", "mayHoatDong", "mayLoi", "hdh", "office", "netSupport", "amThanh", "tocDo", "mayLanh", "camera", "veSinh", "baoTri", "hinhAnh"]],
    ];
    const sample = (field: string): string => (["thoiGian", "batDau", "ketThuc"].includes(field) ? "9:00" : ["pmTruong", "pmCongTy", "pmLamViec"].includes(field) ? "PM2" : ["tongIT", "vang", "tongMay", "mayHoatDong", "mayLoi", "camera"].includes(field) ? "5" : field === "tocDo" ? "45 mbps" : field === "cap" ? "II" : "chữ");
    for (const [key, scope, fields] of groups) {
        const title = TITLE_ALIASES[key].canonical;
        for (const field of fields) {
            const want = row(key, title, scope[field].canonical, sample(field));
            for (const v of scope[field].variants) assert.deepEqual(row(key, title, v, sample(field)), want, `${key} ${field}: "${v}"`);
        }
    }
});

test("form IT đầu ca: dòng nhiều dòng của Công việc thực hiện gõ sai nhãn vẫn nối được các dòng tiếp theo", () => {
    const text = `CÔNG VIỆC ĐẦU CA LÀM\n- Tên Trường: X\n- Công việc thực hiê: Bảo trì\n  thay linh kiện`;
    assert.equal(parseTechRow("shiftStart", text, 0)?.K, "Bảo trì\nthay linh kiện");
});

test("Cấp của form IT viết l, ll, 2 về La Mã", () => {
    assert.equal(row("shiftEnd", "CÔNG VIỆC CUỐI CA LÀM", "Cấp", "l")?.B, "I");
    assert.equal(row("shiftEnd", "CÔNG VIỆC CUỐI CA LÀM", "Cấp", "ll")?.B, "II");
    assert.equal(row("shiftEnd", "CÔNG VIỆC CUỐI CA LÀM", "Cấp", "LC")?.B, "LC");
    assert.equal(row("shiftEnd", "CÔNG VIỆC CUỐI CA LÀM", "Cấp", "Chữ lạ")?.B, "Chữ lạ");
    assert.equal(itLevelValue("III"), "III");
});

test("tiêu đề IT gõ sai được nhận, ĐẦU và CUỐI không lẫn", () => {
    for (const k of ["attendanceStart", "attendanceEnd", "shiftStart", "shiftEnd"] as const) {
        for (const t of all(TITLE_ALIASES[k])) assert.equal(classifyTechTitle(t), k, t);
    }
    for (const t of all(TITLE_ALIASES.shiftEnd)) assert.equal(classifyEndOfShiftTitle(t), true, t);
    for (const t of all(TITLE_ALIASES.shiftStart)) assert.equal(classifyEndOfShiftTitle(t), false, t);
    for (const t of all(TITLE_ALIASES.attendanceStart)) assert.equal(classifyAttendanceTitle(t), true, t);
    for (const t of all(TITLE_ALIASES.attendanceEnd)) assert.equal(classifyAttendanceTitle(t), false, t);
    for (const t of all(TITLE_ALIASES.electric)) assert.equal(classifyElectricTitle(t), true, t);
    assert.equal(classifyTechTitle('"CÔNG VIỆC CUỐI CA LÀM'), "shiftEnd");
});

test("các parser IT riêng (cuối ca, điểm danh, LỖI ĐIỆN) nhận nhãn gõ sai", () => {
    const e = parseEndOfShift("CÔNG VIỆC CUỐI CA LÀM\n- Tên Truog: A\n- Phườg / Xã: Q6\n- Trưởg nhóm IT: Minh\n- Phòng máy làm việ: PM1\n- Tốc độ Intenet: 45 mbps");
    assert.deepEqual([e?.tenTruong, e?.khuVuc, e?.truongNhomIT, e?.phongMay, e?.tocDo], ["A", "Q6", "Minh", "PM1", "45 mbps"]);
    const a = parseAttendanceMessage("ĐIỂM DANH ĐẦU BUỔI\n- Tên Trườg: A\n- Thực tập sinh: Nam, Hảo");
    assert.deepEqual(a.map((x) => x.tenNV), ["Nam", "Hảo"]);
    assert.deepEqual(parseAttendanceMessage("ĐIỂM DANH ĐẦU BUỔI\n- Tên Trường: A\n- Thực tập IT: Ko"), []);
    for (const v of all(NONE_VALUES)) assert.deepEqual(parseAttendanceMessage(`ĐIỂM DANH ĐẦU BUỔI\n- Tên Trường: A\n- Thực tập IT: ${v}`), [], v);
    const el = parseElectricMessage("LỖI ĐIỆN\n- Trườg: A\n- Khu vc: B\n- Phòn máy: PM1\n- Tình trạg: K");
    assert.deepEqual(el, [{ tenTruong: "A", khuVuc: "B", phongMay: "PM1", tinhTrang: "K" }]);
    assert.equal(ELECTRIC_LABELS.truong.canonical, "Trường");
});

test("cleanSchoolName: đưa cấp học về mã đúng, giữ nguyên tên", () => {
    assert.equal(cleanSchoolName("TiH-THCS-THPT Bình Minh"), "TH - THCS - THPT Bình Minh");
    assert.equal(cleanSchoolName("TH - THCS - THPT Hải Đăng"), "TH - THCS - THPT Hải Đăng");
    assert.equal(cleanSchoolName("THCS-THPT Đồng Xanh"), "THCS - THPT Đồng Xanh");
    assert.equal(cleanSchoolName('"THCS - THPT Sao Mai 1*'), "THCS - THPT Sao Mai 1");
    assert.equal(cleanSchoolName("  TH   Kim   Đồng "), "TH Kim Đồng");
    assert.equal(cleanSchoolName("Tiểu học Kim Đồng"), "TH Kim Đồng");
});

test("cleanSchoolName: tên có dấu gạch, chữ giống mã cấp hoặc chuỗi cấp lạ thì giữ nguyên", () => {
    assert.equal(cleanSchoolName("TH Kim Đồng - Q6"), "TH Kim Đồng - Q6");
    assert.equal(cleanSchoolName("THỦ ĐỨC Sao Mai"), "THỦ ĐỨC Sao Mai");
    assert.equal(cleanSchoolName("TH-Kim Đồng"), "TH-Kim Đồng");
    assert.equal(cleanSchoolName("Tiểu Hoa"), "Tiểu Hoa");
    assert.equal(cleanSchoolName("MM Garden"), "MM Garden");
    assert.equal(cleanSchoolName("Sao Mai 1"), "Sao Mai 1");
    assert.equal(cleanSchoolName("TH"), "TH");
});

test("schoolNameMatchesGroup so chữ cái và chữ số, không kể dấu, hoa thường, khoảng trắng", () => {
    assert.equal(schoolNameMatchesGroup("THCS - THPT Sao Mai 1", "SAO MAI 1"), true);
    assert.equal(schoolNameMatchesGroup("THCS - THPT Sao Mai1", "SAO MAI 1"), true);
    assert.equal(schoolNameMatchesGroup("TH - THCS - THPT Bình Minh", "BÌNH MINH"), true);
    assert.equal(schoolNameMatchesGroup("THCS - THPT Sao Mai 2", "SAO MAI 1"), false);
    assert.equal(schoolNameMatchesGroup("Bình Minh", "BÌNH MINH"), true);
});

const SCHOOL_REPORT = (name: string): string => NEW_FORM_END.replace("- Tên Trường: Sao Mai 1", `- Tên Trường: ${name}`);

test("trường khớp tên nhóm không vào review; trường lệch thì vào review với ten_truong_khong_khop và vẫn giữ chữ", async () => {
    const ok = await extractAll([msg(SCHOOL_REPORT("THCS - THPT Sao Mai 1"), at(16))], { day: DAY });
    assert.equal(ok.review.length, 0);
    const bad = await extractAll([msg(SCHOOL_REPORT("THCS - THPT Sao Mai 2"), at(16))], { day: DAY });
    assert.deepEqual(bad.review.map((x) => x.lyDo), [["ten_truong_khong_khop"]]);
    assert.equal(bad.reports[0].data.tenTruong, "THCS - THPT Sao Mai 2");
    assert.equal(bad.reports[0].data.maTrangThai, 1, "chỉ báo xem, không đổi trạng thái tin");
});

test("overrides.json sửa được tenTruong và phuongXa, và đã sửa thì không báo lệch nữa", async () => {
    const m = msg(SCHOOL_REPORT("THCS - THPT Sao Mai 2"), at(16));
    const r = await extractAll([m], { day: DAY, overrides: [{ key: { maNhom: m.groupId, maTinNhan: m.msgId }, sua: { tenTruong: "THCS - THPT Sao Mai 2 (CS mới)", phuongXa: "Tăng Nhơn Phú A" } }] });
    assert.equal(r.reports[0].data.tenTruong, "THCS - THPT Sao Mai 2 (CS mới)");
    assert.equal(r.reports[0].data.phuongXa, "Tăng Nhơn Phú A");
    assert.equal(r.review.length, 0);
});
