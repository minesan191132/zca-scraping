import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGroupName } from "../src/lesson/schoolArea.js";

const cases: Array<[string, string | null, string | null, string | null, string | null]> = [
    // input, capHoc, tenRieng, coSo, khuVuc  (tenRieng null => truong null)
    ["THPT Trần Văn Ơn", "THPT", "TRẦN VĂN ƠN", null, null],
    ["BC", null, null, null, "BC"],
    ["", null, null, null, null],
    ["TH Đặng Văn Bất_Thủ Đức.", "TH", "ĐẶNG VĂN BẤT", null, "TĐ"],
    ["TH Cầu Xáng TĐ", "TH", "CẦU XÁNG", null, "TĐ"],
    ["Nhà VHTH - Bình Dương", null, "NHÀ VHTH", null, "BD"],
    ["THCS Nguyễn Bỉnh Khiêm-CS2 NB", "THCS", "NGUYỄN BỈNH KHIÊM", "CS2", "NB"],
    ["TH Bình Trị 2 cs1 - Bình Tân", "TH", "BÌNH TRỊ 2", "CS1", "BTAN"],
    ["THCS-THPT Nam Việt - Q9", "THCS - THPT", "NAM VIỆT", null, "TĐ"],
    ["LC_ĐồngXanh_PN", "LC", "ĐỒNG XANH", null, "PN"],
    ["Tiểu học Cổ Loa - PN", "TH", "CỔ LOA", null, "PN"],
    ["LC_SaoMai1_TĐ", "LC", "SAO MAI 1", null, "TĐ"],
    ["LC_HảiĐăng_BTAN", "LC", "HẢI ĐĂNG", null, "BTAN"],
    ["LC_BìnhMinh_BTAN", "LC", "BÌNH MINH", null, "BTAN"],
    ["LC_ĐồngXanh_Q5", "LC", "ĐỒNG XANH", null, "Q5"],
    ["bot test", null, "BOT TEST", null, null],
];

for (const [input, capHoc, tenRieng, coSo, khuVuc] of cases) {
    test(`parseGroupName(${JSON.stringify(input)})`, () => {
        const r = parseGroupName(input);
        assert.equal(r.khuVuc, khuVuc);
        if (tenRieng === null) assert.equal(r.truong, null);
        else assert.deepEqual(r.truong, { capHoc, tenRieng, coSo });
    });
}
