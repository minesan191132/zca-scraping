import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import path from "node:path";
import { appHome } from "../src/core/paths.js";
import { licensePath, readMachineId, signLicense, verifyLicense, type LicensePayload } from "../src/core/license.js";

function keys() {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    return {
        pub: publicKey.export({ type: "spki", format: "pem" }).toString(),
        priv: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    };
}

const MACHINE = "11111111-2222-3333-4444-555555555555";
const ISSUED = Date.parse("2026-10-01T00:00:00.000Z");
const EXPIRES = Date.parse("2026-12-30T00:00:00.000Z");
const payload: LicensePayload = { customer: "Khach A", machineId: MACHINE, issuedAt: new Date(ISSUED).toISOString(), expiresAt: new Date(EXPIRES).toISOString() };
const k = keys();
const raw = signLicense(payload, k.priv);
const opts = (now: number, machineId = MACHINE, publicKeyPem = k.pub) => ({ machineId, now, publicKeyPem });

test("giấy phép hợp lệ cho ok và mang đúng khách hàng", () => {
    const r = verifyLicense(raw, opts(ISSUED + 1000));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.payload.customer, "Khach A");
});

test("đổi một ký tự trong payload cho bad-signature", () => {
    const file = JSON.parse(raw) as { payload: string; sig: string };
    file.payload = file.payload.replace("Khach A", "Khach B");
    const r = verifyLicense(JSON.stringify(file), opts(ISSUED + 1000));
    assert.deepEqual(r.ok ? null : r.reason, "bad-signature");
});

test("sig không phải base64 hợp lệ cho bad-signature (chọn bad-signature, không bad-format)", () => {
    const file = JSON.parse(raw) as { payload: string; sig: string };
    file.sig = "!!!không-phải-base64!!!";
    const r = verifyLicense(JSON.stringify(file), opts(ISSUED + 1000));
    assert.deepEqual(r.ok ? null : r.reason, "bad-signature");
});

test("ký bằng khóa khác cho bad-signature", () => {
    const other = keys();
    const r = verifyLicense(signLicense(payload, other.priv), opts(ISSUED + 1000));
    assert.deepEqual(r.ok ? null : r.reason, "bad-signature");
});

test("khóa công khai không phải PEM cho bad-signature, không ném", () => {
    const r = verifyLicense(raw, opts(ISSUED + 1000, MACHINE, "KHONG-PHAI-PEM"));
    assert.deepEqual(r.ok ? null : r.reason, "bad-signature");
});

test("machineId khác cho wrong-machine", () => {
    const r = verifyLicense(raw, opts(ISSUED + 1000, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"));
    assert.deepEqual(r.ok ? null : r.reason, "wrong-machine");
});

test("đúng lúc expiresAt là hết hạn, trước 1 ms còn hạn", () => {
    const at = verifyLicense(raw, opts(EXPIRES));
    assert.deepEqual(at.ok ? null : at.reason, "expired");
    assert.equal(verifyLicense(raw, opts(EXPIRES - 1)).ok, true);
});

test("chuỗi rỗng, '{', '{}' cho bad-format", () => {
    for (const bad of ["", "{", "{}", "[]", "null", '{"payload":1,"sig":2}']) {
        const r = verifyLicense(bad, opts(ISSUED));
        assert.deepEqual(r.ok ? null : r.reason, "bad-format", bad);
    }
});

test("payload đã ký nhưng thiếu trường hay ngày hỏng cho bad-format", () => {
    const missing = signLicense({ customer: "A" } as unknown as LicensePayload, k.priv);
    assert.deepEqual((verifyLicense(missing, opts(ISSUED)) as { reason: string }).reason, "bad-format");
    const badDate = signLicense({ ...payload, expiresAt: "không phải ngày" }, k.priv);
    assert.deepEqual((verifyLicense(badDate, opts(ISSUED)) as { reason: string }).reason, "bad-format");
});

test("readMachineId trả GUID", { skip: process.platform !== "win32" }, () => {
    assert.match(readMachineId(), /^[0-9a-f-]{36}$/i);
});

test("licensePath nằm dưới appHome", () => {
    const rel = path.relative(appHome, licensePath());
    assert.ok(!rel.startsWith("..") && !path.isAbsolute(rel));
    assert.equal(path.basename(licensePath()), "license.json");
});
