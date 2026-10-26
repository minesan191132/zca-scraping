import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveReport, extractRaw } from "../src/lesson/build.js";
import { buildLoaRows, buildMayTinhRows, buildNetSupportRows } from "../src/lesson/statusRows.js";
import { roomKeyString } from "../src/lesson/roomKey.js";
import type { SourceMessage } from "../src/types/index.js";

const GROUP = "LC_HảiĐăng_BTAN";

const MESSAGE = `BÁO CÁO ĐẦU BUỔI
- Cấp: LC
- Tên Trường: TH - THCS - THPT Hải Đăng
- Phân hiệu: 
- Phường/Xã: Bình Hưng Hòa B
- Tên Giáo viên: Phương Anh
- Tên Trợ giảng: Không
- Phòng máy: H002
- Tổng số máy: 40 + 1 GV
- Số máy bị lỗi: 3 (máy 12, 16, 31 không lên nguồn)
- Số máy còn thiếu: 0
- Tình trạng Netsupport: T
- Tình trạng Âm thanh: T
- Tình trạng Máy lạnh: T`;

const msg = (content: string): SourceMessage => ({ groupId: "g1", groupName: GROUP, msgId: "m1", senderId: "u1", ts: 1000, msgType: "desktop.text", content }) as SourceMessage;

test("tên trường và Phường/Xã của tin vào cột B, C, không lấy từ tên nhóm", () => {
    const raw = extractRaw(MESSAGE, GROUP);
    assert.equal(raw.tenTruong, "TH - THCS - THPT Hải Đăng");
    assert.equal(raw.phuongXa, "Bình Hưng Hòa B");
    assert.deepEqual(raw.missing, []);
    assert.deepEqual(raw.unknownLabels, []);
    const report = deriveReport(msg(MESSAGE), "DauBuoi", raw);
    for (const rows of [buildNetSupportRows([report]), buildLoaRows([report]), buildMayTinhRows([report])]) {
        assert.equal(rows[0].B, "TH - THCS - THPT Hải Đăng");
        assert.equal(rows[0].C, "Bình Hưng Hòa B");
    }
});

test("khóa tra phòng vẫn đọc từ tên nhóm, không đổi theo tin", () => {
    const withLines = extractRaw(MESSAGE, GROUP);
    const without = extractRaw(MESSAGE.replace(/^- (Tên Trường|Phường\/Xã):.*\n/gm, ""), GROUP);
    assert.deepEqual(withLines.truong, without.truong);
    assert.equal(withLines.khuVuc, "BTAN");
    assert.equal(roomKeyString({ room: "H002", capHoc: withLines.truong!.capHoc, tenRieng: withLines.truong!.tenRieng, coSo: null, khuVuc: withLines.khuVuc! }), roomKeyString({ room: "H002", capHoc: without.truong!.capHoc, tenRieng: without.truong!.tenRieng, coSo: null, khuVuc: without.khuVuc! }));
});

test("tin cũ không có hai dòng đó thì cột B, C lấy từ tên nhóm", () => {
    const old = MESSAGE.replace(/^- (Tên Trường|Phường\/Xã):.*\n/gm, "");
    const raw = extractRaw(old, GROUP);
    assert.equal(raw.tenTruong, null);
    assert.equal(raw.phuongXa, null);
    const rows = buildNetSupportRows([deriveReport(msg(old), "DauBuoi", raw)]);
    assert.equal(rows[0].B, "HẢI ĐĂNG");
    assert.equal(rows[0].C, "BTAN");
});

test("dòng Tên Trường để trống coi như không có", () => {
    const raw = extractRaw(MESSAGE.replace("TH - THCS - THPT Hải Đăng", ""), GROUP);
    assert.equal(raw.tenTruong, null);
});
