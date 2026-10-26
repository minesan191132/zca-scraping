import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILTIN_DEFINITIONS } from "../src/definitions/builtin/index.js";
import { rowsInWindow } from "../src/definitions/engine.js";
import { buildFillParts } from "../src/definitions/fillParts.js";
import { validateDefinition } from "../src/definitions/validate.js";
import { parseCutoff, techRowsInWindow, TECH_KEYS, type TechKey } from "./fixtures/baseTechReport.js";
import { rowsSignature } from "../src/lesson/dayReportState.js";
import { TECH_LAYOUT, techFormulaCells, techHeaderCells, techRowsForFill } from "../src/lesson/techReportRows.js";
import type { ReportDefinition } from "../src/definitions/types.js";
import type { SourceMessage } from "../src/types/index.js";

// Phép thử tương đương: bốn định nghĩa dựng sẵn qua bộ máy phải cho CÙNG dữ liệu điền Excel như mã cũ (techReport.ts, techReportRows.ts) trên cùng tin mẫu.
// Tin mẫu chép từ tests/techReport.test.ts (form IT, sheet "MỚI (2)" của 01 - MAU BAO CAO KY THUAT.xlsx).
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

const DAY = "2026-10-22";
const REPORTER = "Nguyễn Thu Hà";
const vn = (hour: number, minute: number, day = 22): number => Date.UTC(2026, 9, day, hour - 7, minute);
let seq = 0;
const msg = (content: string, ts: number, msgType = "desktop.text"): SourceMessage => ({ msgId: `m${String(++seq).padStart(3, "0")}`, groupId: "g", groupName: "G", senderId: "s", ts, msgType, content });

/** Các biến thể của một tin mẫu: gõ sai nhãn, sau mốc giờ, ngày khác, thiếu hoặc để trống Tên Trường, không phải tin chữ. */
function variants(base: string, inWindow: (m: number) => number, after: number): SourceMessage[] {
    return [
        msg(base, inWindow(0)),
        msg(base.replace("Tên Trường:", "Tên Trườg:").replace("TH LƯƠNG THẾ VINH", "TH NGUYỄN DU"), inWindow(1)),
        msg(base.replace("Tên Trường:", "Tên Truog:").replace("TH LƯƠNG THẾ VINH", "TH LÊ LỢI"), inWindow(2)),
        msg(base.replace("- Tên Trường: TH LƯƠNG THẾ VINH\n", ""), inWindow(3)),
        msg(base.replace("TH LƯƠNG THẾ VINH", ""), inWindow(4)),
        msg(`"${base}"`, inWindow(5)),
        msg(`*${base.replace("\n", "*:\n")}`, inWindow(6)),
        msg(base.replace("TH LƯƠNG THẾ VINH", "TH SAU MỐC"), after),
        msg(base.replace("TH LƯƠNG THẾ VINH", "TH NGÀY KHÁC"), vn(8, 0, 23)),
        msg(base.replace("TH LƯƠNG THẾ VINH", "TH ẢNH"), inWindow(7), "chat.photo"),
    ];
}

const MESSAGES: SourceMessage[] = [
    // Điểm danh đầu buổi, mốc 08:30: tin lúc 08:30 còn lấy, 08:31 bỏ.
    ...variants(ROLL_START, (i) => vn(8, 5 + i), vn(8, 31)),
    msg(ROLL_START.replace("TH LƯƠNG THẾ VINH", "TH ĐÚNG MỐC"), vn(8, 30)),
    msg(ROLL_START.replace("- Phường / Xã: THỦ ĐỨC", "- Phường / Xã: THỦ ĐỨC\n- Thời gian: 8:00"), vn(8, 20)),
    msg(ROLL_START.replace("- Phường / Xã: THỦ ĐỨC", "- Phường / Xã: THỦ ĐỨC\n- Thời gian: sáng sớm"), vn(8, 21)),
    msg(ROLL_START.replace("Văn Long, Minh Tuấn", "0").replace("Nhân viên vắng: 0", "Nhân viên vắng: An"), vn(8, 22)),
    // Hai tin cùng giờ gửi: xếp theo mã tin.
    msg(ROLL_START.replace("TH LƯƠNG THẾ VINH", "TH CÙNG GIỜ"), vn(8, 5)),
    // Điểm danh cuối buổi, mốc 12:30.
    ...variants(ROLL_END, (i) => vn(11, 50 + i), vn(12, 31)),
    msg(ROLL_END.replace("- Phường / Xã: THỦ ĐỨC", "- Phường / Xã: THỦ ĐỨC\n- Thời gian: 12:00"), vn(12, 30)),
    // Công việc đầu ca, mốc 09:00.
    ...variants(SHIFT_START, (i) => vn(8, 40 + i), vn(9, 1)),
    msg(SHIFT_START.replace("9:00", "sáng").replace("Công việc thực hiện: Bảo trì, thay thế linh kiện", "Công việc thực hiện:\n- Bảo trì\n- Thay RAM"), vn(8, 55)),
    msg(SHIFT_START.replace("- Phòng máy làm việc: PM2", "- Phòng máy làm việc: PM2\n- Phòng máy làm việc: PM3"), vn(8, 56)),
    // Công việc cuối ca, mốc 12:00.
    ...variants(SHIFT_END, (i) => vn(11, 30 + i), vn(12, 1)),
    msg(SHIFT_END.replace("Tình trạng Netsupport", "Tình trạng Netsuppot").replace("TH LƯƠNG THẾ VINH", "TH NETSUPPOT"), vn(11, 45)),
    msg(SHIFT_END.replace(" + Tốc độ Internet: 90 mbps\n", ""), vn(11, 46)),
    msg(SHIFT_END.replace("90 mbps", "500 kbps"), vn(11, 47)),
    msg(SHIFT_END.replace("90 mbps", "Không có mạng"), vn(11, 48)),
    msg(SHIFT_END.replace("Tốc độ Internet: 90 mbps", "Tốc độ Internet:"), vn(11, 49)),
    msg(SHIFT_END.replace("1 hoạt động", "Không có").replace("1 Media tốt, 1 sumikura yếu", ""), vn(11, 50)),
    msg(SHIFT_END.replace("11:30", "trưa"), vn(12, 0)),
    // Tiêu đề lạ: không thuộc báo cáo nào.
    msg(SHIFT_END.replace("CÔNG VIỆC CUỐI CA LÀM", "CÔNG VIỆC CUỐI CA LÀM (sửa)"), vn(11, 51)),
    msg("BÁO CÁO CUỐI BUỔI\n- Tên Trường: X", vn(11, 52)),
];

const defOf = (key: TechKey): ReportDefinition => {
    const def = BUILTIN_DEFINITIONS.find((d) => d.code === key);
    assert.ok(def, `thiếu định nghĩa dựng sẵn ${key}`);
    return def;
};

test("có đúng bốn định nghĩa dựng sẵn, mỗi cái qua validateDefinition", () => {
    assert.deepEqual(BUILTIN_DEFINITIONS.map((d) => d.code).sort(), [...TECH_KEYS].sort());
    for (const def of BUILTIN_DEFINITIONS) {
        const r = validateDefinition(def);
        assert.ok(r.ok, `${def.code}: ${r.ok ? "" : r.errors.join("; ")}`);
    }
});

for (const key of TECH_KEYS) {
    test(`${key}: bộ máy cho cùng dòng và cùng dữ liệu điền như mã cũ`, () => {
        const def = defOf(key);
        const { rows } = rowsInWindow(def, MESSAGES, DAY);
        const old = techRowsInWindow(MESSAGES, key, DAY, parseCutoff(def.window.cutoff));
        assert.ok(old.length >= 4, `tin mẫu phải cho ít nhất 4 dòng ở ${key} (đang ${old.length})`);
        assert.deepEqual(rows, old);
        // deepEqual không bắt thứ tự khóa, mà chữ ký dòng (rowsSignature, dựa trên JSON.stringify) phụ thuộc nó: khác thì báo cáo bị dựng lại thừa mỗi chu trình.
        assert.equal(JSON.stringify(rows), JSON.stringify(old));
        assert.equal(rowsSignature(rows), rowsSignature(old));
        assert.deepEqual(buildFillParts(def, rows, DAY, REPORTER), {
            layout: TECH_LAYOUT[key],
            rows: techRowsForFill(old),
            headerCells: techHeaderCells(key, DAY, REPORTER),
            formulaCells: techFormulaCells(key, old.length),
        });
        // Không có người báo cáo: không ghi ô A2, như mã cũ.
        assert.deepEqual(buildFillParts(def, rows, DAY).headerCells, techHeaderCells(key, DAY));
    });

    test(`${key}: tin thiếu hoặc để trống Tên Trường không thành dòng mà thành mục cần xem`, () => {
        const def = defOf(key);
        const { review } = rowsInWindow(def, MESSAGES, DAY);
        // Thiếu dòng, để trống, và hai nhãn gõ sai không có trong bảng chính tả ("Tên Truog" chỉ là ví dụ trong chú thích của bảng).
        assert.ok(review.length >= 2, `${key}: ${JSON.stringify(review)}`);
        for (const item of review) {
            assert.equal(item.code, key);
            assert.deepEqual(item.missing, ["ten truong"]);
        }
    });

    test(`${key}: không có tin nào thì bảng trắng một dòng như techRowsForFill`, () => {
        const def = defOf(key);
        const { rows, review } = rowsInWindow(def, [], DAY);
        assert.deepEqual(rows, techRowsInWindow([], key, DAY, parseCutoff(def.window.cutoff)));
        assert.deepEqual(review, []);
        assert.deepEqual(buildFillParts(def, rows, DAY, REPORTER), {
            layout: TECH_LAYOUT[key],
            rows: techRowsForFill([]),
            headerCells: techHeaderCells(key, DAY, REPORTER),
            formulaCells: techFormulaCells(key, 0),
        });
    });
}

test("nhãn gõ sai có trong bảng chính tả vào đúng cột như mã cũ", () => {
    const att = rowsInWindow(defOf("attendanceStart"), MESSAGES, DAY).rows;
    assert.ok(att.some((r) => r.C === "TH NGUYỄN DU"), "Tên Trườg");
    const end = rowsInWindow(defOf("shiftEnd"), MESSAGES, DAY).rows;
    assert.equal(end.find((r) => r.C === "TH NETSUPPOT")?.N, "T", "Tình trạng Netsuppot");
});

test("deleteSheets theo thứ tự ĐẦU BUỔI, CUỐI BUỔI, ĐẦU CA, CUỐI CA, bỏ sheet của chính mã", () => {
    assert.deepEqual(defOf("attendanceStart").template.deleteSheets, ["CUỐI BUỔI", "ĐẦU CA", "CUỐI CA"]);
    assert.deepEqual(defOf("shiftEnd").template.deleteSheets, ["ĐẦU BUỔI", "CUỐI BUỔI", "ĐẦU CA"]);
});
