import fs from "node:fs";
import path from "node:path";
import { signLicense } from "../core/license.js";

/**
 * Cấp giấy phép: chỉ chạy ở máy tác giả, KHÔNG là điểm vào của `dist` (build:dist kiểm). Khóa riêng đọc từ file ngoài kho mã.
 *
 *   npm run license:issue -- --customer "<tên>" --machine <MachineGuid> --days 90 --key <khóa riêng PEM> --out <file>
 */
export interface IssueArgs {
    customer: string;
    machineId: string;
    days: number;
}

export const ISSUE_USAGE = 'Dùng: license:issue -- --customer "<tên>" --machine <MachineGuid> [--days 90] --key <khóa riêng PEM> --out <file>';

export function buildLicense(args: IssueArgs, now: number, privateKeyPem: string): string {
    return signLicense(
        { customer: args.customer, machineId: args.machineId, issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + args.days * 24 * 60 * 60 * 1000).toISOString() },
        privateKeyPem,
    );
}

export type ParsedIssue = { ok: true; args: IssueArgs; key: string; out: string } | { ok: false; error: string };

export function parseIssueArgs(argv: string[]): ParsedIssue {
    const opt = (name: string): string | undefined => {
        const i = argv.indexOf(name);
        return i >= 0 ? argv[i + 1] : undefined;
    };
    const customer = opt("--customer")?.trim();
    const machineId = opt("--machine")?.trim();
    const key = opt("--key");
    const out = opt("--out");
    const days = Number(opt("--days") ?? "90");
    if (!customer) return { ok: false, error: "thiếu --customer" };
    if (!machineId) return { ok: false, error: "thiếu --machine" };
    if (!/^[0-9a-f-]{36}$/i.test(machineId)) return { ok: false, error: "--machine phải là MachineGuid (36 ký tự)" };
    if (!key) return { ok: false, error: "thiếu --key" };
    if (!out) return { ok: false, error: "thiếu --out" };
    if (!Number.isInteger(days) || days <= 0) return { ok: false, error: "--days phải là số nguyên dương" };
    return { ok: true, args: { customer, machineId, days }, key, out };
}

function main(): void {
    const parsed = parseIssueArgs(process.argv.slice(2));
    if (!parsed.ok) {
        console.error(`${parsed.error}\n${ISSUE_USAGE}`);
        process.exit(1);
    }
    const text = buildLicense(parsed.args, Date.now(), fs.readFileSync(parsed.key, "utf8"));
    fs.writeFileSync(parsed.out, text, "utf8");
    console.log(`đã cấp giấy phép cho "${parsed.args.customer}" (${parsed.args.days} ngày) -> ${parsed.out}`);
}

// Chỉ chạy khi là điểm vào: test nạp file này để thử hàm thuần.
if (path.basename(process.argv[1] ?? "").startsWith("issue-license")) main();
