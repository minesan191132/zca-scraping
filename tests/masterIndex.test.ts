import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { norm, roomKey, schoolKey } from "../src/master/masterKeys.js";
import { indexMaster } from "../src/master/masterIndex.js";
import { writeMasterFixture } from "./helpers/masterFixtures.js";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "master-"));

test("norm: bỏ dấu, hoa thường, khoảng trắng thừa; roomKey: PM1 = 1, P36 giữ chữ", () => {
    assert.equal(norm("  THCS  Vĩnh   Lộc B "), "thcs vinh loc b");
    assert.equal(schoolKey("THCS", "VĨNH LỘC B"), "thcs vinh loc b");
    assert.equal(roomKey("PM1"), "1");
    assert.equal(roomKey(1), "1");
    assert.equal(roomKey("pm 2"), "2");
    assert.equal(roomKey("P36"), "p36");
    assert.equal(roomKey(undefined), "");
});

test("indexMaster tệp 07: hàng, khu vực, ô ngày; bỏ sheet FORM và hàng không có tên trường", () => {
    const file = path.join(tmp(), "07.xlsx");
    writeMasterFixture(
        file,
        {
            "TP HCM": [["TH Võ Thị Sáu", "GV", null, 46298, null], ["THCS Vĩnh Lộc B ", "BC", null, null, null]],
            BD: [["TH Phú Hòa 1", "Thủ Dầu Một", null, 46300, null]],
            FORM: [["TH Mẫu", "X", null, 1, null]],
        },
        { speed: false },
    );
    const rows = indexMaster(file, { date: "BẢO TRÌ GN" });
    assert.deepEqual(rows.map((r) => [r.sheet, r.row, r.schoolKey, r.khuVuc, r.dateRef, r.date]), [
        ["TP HCM", 4, "th vo thi sau", "gv", "H4", 46298],
        ["TP HCM", 5, "thcs vinh loc b", "bc", "H5", null],
        ["BD", 4, "th phu hoa 1", "thu dau mot", "H4", 46300],
    ]);
    assert.equal(rows[0].speedRef, null);
});

test("indexMaster tệp 08: cột PM, TỐC ĐỘ (tiêu đề có dấu cách cuối) và NGÀY CẬP NHẬT", () => {
    const file = path.join(tmp(), "08.xlsx");
    writeMasterFixture(file, { "TP HCM": [["THCS Vĩnh Lộc B", "BC", "3", 46293, 95], ["THCS Vĩnh Lộc B", "BC", "P36", null, null]] }, { speed: true });
    const rows = indexMaster(file, { date: "NGÀY CẬP NHẬT", speed: "TỐC ĐỘ" });
    assert.deepEqual(rows.map((r) => [r.room, r.dateRef, r.speedRef, r.date, r.speed]), [
        ["3", "J4", "F4", 46293, 95],
        ["p36", "J5", "F5", null, null],
    ]);
});
