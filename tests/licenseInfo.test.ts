import { test } from "node:test";
import assert from "node:assert/strict";
import { describeLicense } from "../src/cli/license-info.js";
import type { LicenseFailure, LicenseResult } from "../src/core/license.js";

const M = "11111111-2222-3333-4444-555555555555";

test("ok mang customer, expiresAt và mã máy", () => {
    const r: LicenseResult = { ok: true, payload: { customer: "A", machineId: M, issuedAt: "2026-01-01T00:00:00Z", expiresAt: "2026-04-01T00:00:00Z" } };
    assert.deepEqual(describeLicense(r, M), { state: "ok", customer: "A", expiresAt: "2026-04-01T00:00:00Z", machineId: M });
});

test("năm lý do lỗi cho đúng state, customer và expiresAt null", () => {
    const reasons: LicenseFailure[] = ["missing", "bad-format", "bad-signature", "wrong-machine", "machine-unreadable", "expired"];
    for (const reason of reasons) {
        assert.deepEqual(describeLicense({ ok: false, reason }, M), { state: reason, customer: null, expiresAt: null, machineId: M });
    }
});

test("không đọc được mã máy thì machineId là null", () => {
    assert.equal(describeLicense({ ok: false, reason: "missing" }, null).machineId, null);
});
