import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { appHome } from "./paths.js";

/**
 * Giấy phép ký số kiểm ngoại tuyến. File `{ "payload": "<chuỗi JSON>", "sig": "<base64>" }`, chữ ký Ed25519 phủ đúng các byte của `payload`.
 * Khóa riêng chỉ nằm ở máy tác giả (`issue-license.ts`); mã này chỉ có khóa công khai.
 */
export interface LicensePayload {
    customer: string;
    machineId: string;
    /** ISO 8601 */
    issuedAt: string;
    /** ISO 8601 */
    expiresAt: string;
}

export type LicenseFailure = "missing" | "bad-format" | "bad-signature" | "wrong-machine" | "machine-unreadable" | "expired";
export type LicenseResult = { ok: true; payload: LicensePayload } | { ok: false; reason: LicenseFailure; detail?: string };

export const licensePath = (): string => path.join(appHome, "license.json");

/** Khóa công khai nhúng (khóa riêng nằm ngoài cả hai repo, không bao giờ vào repo hay gói cài). */
export const LICENSE_PUBLIC_KEY_PEM = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEArvkinnD+GgFgIs8Lm62b14yCO0mrdjmxYsP+JHJ3Xdg=\n-----END PUBLIC KEY-----\n";

export function signLicense(payload: LicensePayload, privateKeyPem: string): string {
    const text = JSON.stringify(payload);
    const sig = sign(null, Buffer.from(text, "utf8"), createPrivateKey(privateKeyPem)).toString("base64");
    return JSON.stringify({ payload: text, sig });
}

const bad = (reason: LicenseFailure, detail?: string): LicenseResult => ({ ok: false, reason, detail });

/** Không ném. Thứ tự: hình dạng file, chữ ký (trước khi đọc payload, để payload bị sửa luôn là bad-signature), nội dung payload, máy, hạn. */
export function verifyLicense(raw: string, opts: { machineId: string; now: number; publicKeyPem: string }): LicenseResult {
    let file: unknown;
    try {
        file = JSON.parse(raw);
    } catch {
        return bad("bad-format", "không phải JSON");
    }
    const f = file as { payload?: unknown; sig?: unknown } | null;
    if (!f || typeof f !== "object" || typeof f.payload !== "string" || typeof f.sig !== "string") return bad("bad-format", "thiếu payload hoặc sig");

    try {
        const okSig = verify(null, Buffer.from(f.payload, "utf8"), createPublicKey(opts.publicKeyPem), Buffer.from(f.sig, "base64"));
        if (!okSig) return bad("bad-signature");
    } catch (err) {
        return bad("bad-signature", (err as Error).message);
    }

    let p: Partial<LicensePayload>;
    try {
        p = JSON.parse(f.payload) as Partial<LicensePayload>;
    } catch {
        return bad("bad-format", "payload không phải JSON");
    }
    if (!p || typeof p !== "object" || typeof p.customer !== "string" || typeof p.machineId !== "string" || typeof p.issuedAt !== "string" || typeof p.expiresAt !== "string") {
        return bad("bad-format", "payload thiếu trường");
    }
    const expires = Date.parse(p.expiresAt);
    if (Number.isNaN(expires) || Number.isNaN(Date.parse(p.issuedAt))) return bad("bad-format", "ngày không hợp lệ");

    if (p.machineId.toLowerCase() !== opts.machineId.toLowerCase()) return bad("wrong-machine");
    if (expires <= opts.now) return bad("expired");
    return { ok: true, payload: p as LicensePayload };
}

/** MachineGuid của Windows. Ném lỗi nêu rõ nếu không đọc được. */
export function readMachineId(): string {
    let out: string;
    try {
        out = execFileSync("reg", ["query", String.raw`HKLM\SOFTWARE\Microsoft\Cryptography`, "/v", "MachineGuid"], { encoding: "utf8", windowsHide: true });
    } catch (err) {
        throw new Error(`không đọc được mã máy (MachineGuid): ${(err as Error).message}`);
    }
    const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-f-]{36})/i);
    if (!m) throw new Error("không đọc được mã máy (MachineGuid): đầu ra của reg không có GUID");
    return m[1];
}

/** Đọc file giấy phép ở `ZBOT_HOME`, mã máy và khóa công khai nhúng. Không ném. */
export function checkLicense(now: number = Date.now()): LicenseResult {
    let raw: string;
    try {
        raw = fs.readFileSync(licensePath(), "utf8");
    } catch {
        return bad("missing", licensePath());
    }
    let machineId: string;
    try {
        machineId = readMachineId();
    } catch (err) {
        return bad("machine-unreadable", (err as Error).message);
    }
    return verifyLicense(raw, { machineId, now, publicKeyPem: LICENSE_PUBLIC_KEY_PEM });
}
