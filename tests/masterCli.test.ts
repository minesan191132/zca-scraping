import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../src/master/runMasterCli.js";

const base = { file: "D:/x/tong/Nhi/a.xlsx", written: 0, review: [], backup: null, cells: [] };

test("không có gì để ghi", () => {
    assert.deepEqual(summarize("maintenance", "NguoiB", "2026-10-09", base, false), ["[maintenance] bộ NguoiB, ngày 2026-10-09: không có ô nào cần ghi vào D:/x/tong/Nhi/a.xlsx"]);
});
test("đã ghi: nêu số ô, bản sao lưu và số mục cần xem", () => {
    const lines = summarize("internetSpeed", "NguoiB", "2026-10-09", { ...base, written: 4, backup: "D:/x/sao-luu/b.xlsm", review: [{ school: "THCS Z", khuVuc: "Q1", room: "PM1", msgId: "m", reason: "khong_khop" }] }, false);
    assert.equal(lines[0], "[internetSpeed] bộ NguoiB, ngày 2026-10-09: đã ghi 4 ô vào D:/x/tong/Nhi/a.xlsx (sao lưu: D:/x/sao-luu/b.xlsm)");
    assert.equal(lines[1], "[internetSpeed] 1 mục cần xem (không khớp dòng nào hoặc mơ hồ): THCS Z / Q1 / PM1");
});
test("chạy thử: liệt kê từng ô sẽ ghi", () => {
    const cells = [{ sheet: "TP HCM", cell: "H4", value: 46304, note: "TH A: bảo trì 2026-10-09" }];
    assert.deepEqual(summarize("maintenance", "NguoiB", "2026-10-09", { ...base, cells }, true), [
        "[maintenance] bộ NguoiB, ngày 2026-10-09: CHẠY THỬ, sẽ ghi 1 ô, chưa ghi gì",
        "  TP HCM!H4 = 46304  (TH A: bảo trì 2026-10-09)",
    ]);
});
