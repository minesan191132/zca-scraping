import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { buildLicense, parseIssueArgs } from "../src/cli/issue-license.js";
import { verifyLicense } from "../src/core/license.js";

const MACHINE = "11111111-2222-3333-4444-555555555555";
const NOW = Date.parse("2026-10-24T00:00:00.000Z");

test("buildLicense ký được, verifyLicense chấp nhận với khóa công khai tương ứng, hạn đúng 90 ngày", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const pub = publicKey.export({ type: "spki", format: "pem" }).toString();
    const priv = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const raw = buildLicense({ customer: "Khach A", machineId: MACHINE, days: 90 }, NOW, priv);
    const ok = verifyLicense(raw, { machineId: MACHINE, now: NOW + 1, publicKeyPem: pub });
    assert.equal(ok.ok, true);
    if (ok.ok) {
        assert.equal(ok.payload.customer, "Khach A");
        assert.equal(Date.parse(ok.payload.expiresAt) - Date.parse(ok.payload.issuedAt), 90 * 24 * 60 * 60 * 1000);
    }
    const late = verifyLicense(raw, { machineId: MACHINE, now: NOW + 90 * 24 * 60 * 60 * 1000, publicKeyPem: pub });
    assert.equal(late.ok, false);
});

test("parseIssueArgs: mặc định 90 ngày, thiếu tham số thì báo lỗi", () => {
    const good = parseIssueArgs(["--customer", "A", "--machine", MACHINE, "--key", "k.pem", "--out", "l.json"]);
    assert.ok(good.ok && good.args.days === 90);
    for (const drop of ["--customer", "--machine", "--key", "--out"]) {
        const argv = ["--customer", "A", "--machine", MACHINE, "--key", "k.pem", "--out", "l.json"];
        const i = argv.indexOf(drop);
        argv.splice(i, 2);
        assert.equal(parseIssueArgs(argv).ok, false, drop);
    }
    assert.equal(parseIssueArgs(["--customer", "A", "--machine", "abc", "--key", "k", "--out", "o"]).ok, false);
    assert.equal(parseIssueArgs(["--customer", "A", "--machine", MACHINE, "--key", "k", "--out", "o", "--days", "0"]).ok, false);
});
