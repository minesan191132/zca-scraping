import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { licenseGate } from "../src/core/licenseGate.js";
import type { LicenseFailure, LicenseResult } from "../src/core/license.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const OK: LicenseResult = { ok: true, payload: { customer: "A", machineId: "m", issuedAt: "2026-01-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z" } };
const REASONS: LicenseFailure[] = ["missing", "bad-format", "bad-signature", "wrong-machine", "machine-unreadable", "expired"];

test("build-dist.mjs đặt define cho process.env.ZBOT_BUNDLED lúc dựng", () => {
    const src = read("scripts/build-dist.mjs");
    assert.ok(src.includes("define:"));
    assert.ok(src.includes('"process.env.ZBOT_BUNDLED"'));
});

test("không đặt ZBOT_BUNDLED thì cho qua và không gọi check", () => {
    let calls = 0;
    const r = licenseGate({}, () => (calls++, OK));
    assert.deepEqual(r, { allow: true });
    assert.equal(calls, 0);
    assert.deepEqual(licenseGate({ ZBOT_BUNDLED: "0" }, () => (calls++, OK)), { allow: true });
    assert.equal(calls, 0);
});

test("ZBOT_BUNDLED=1 với giấy phép ok thì cho qua", () => {
    assert.deepEqual(licenseGate({ ZBOT_BUNDLED: "1" }, () => OK), { allow: true });
});

test("mỗi lý do từ chối cho exitCode 3 và câu riêng", () => {
    const messages = new Set<string>();
    for (const reason of REASONS) {
        const r = licenseGate({ ZBOT_BUNDLED: "1" }, () => ({ ok: false, reason }));
        assert.equal(r.allow, false);
        if (!r.allow) {
            assert.equal(r.exitCode, 3);
            assert.ok(r.message.length > 10);
            messages.add(r.message);
        }
    }
    assert.equal(messages.size, REASONS.length);
});

test("missing và wrong-machine nhắc gửi mã máy; mã máy chỉ in khi đọc được", () => {
    for (const reason of ["missing", "wrong-machine"] as const) {
        const withId = licenseGate({ ZBOT_BUNDLED: "1" }, () => ({ ok: false, reason }), () => "AAAA-BBBB");
        const noId = licenseGate({ ZBOT_BUNDLED: "1" }, () => ({ ok: false, reason }), () => null);
        assert.ok(!withId.allow && /mã máy/i.test(withId.message) && withId.message.includes("AAAA-BBBB"));
        assert.ok(!noId.allow && /mã máy/i.test(noId.message) && !noId.message.includes("AAAA-BBBB"));
    }
});

// Hiện không CLI nào chặn bằng giấy phép (chủ sản phẩm đã bỏ yêu cầu này). Mô-đun cổng vẫn còn để bật lại: thêm `requireLicense()` vào dòng đầu của ba bot điều khiển Zalo và sửa lại test này.
test("không CLI nào gọi requireLicense: bản bán chạy không cần giấy phép", () => {
    for (const f of ["bot-watch-core", "bot-dispatch", "bot-scrape", "config-dump", "export-excel"]) assert.ok(!read(`src/cli/${f}.ts`).includes("requireLicense"), f);
});
