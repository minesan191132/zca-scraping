import path from "node:path";
import { checkLicense, readMachineId, type LicenseFailure, type LicenseResult } from "../core/license.js";

/**
 * Trạng thái giấy phép cho panel: một dòng sau dấu `@@JSON@@` là `LicenseInfo`. Gộp được và KHÔNG có cổng giấy phép
 * (panel cần đọc nó để hiện lý do và mã máy khi chưa có giấy phép). Panel không có mã xác minh riêng: nó hỏi lệnh này.
 *
 *   node dist/cli/license-info.js
 */
export interface LicenseInfo {
    state: "ok" | LicenseFailure;
    customer: string | null;
    expiresAt: string | null;
    /** null khi không đọc được mã máy */
    machineId: string | null;
}

export function describeLicense(result: LicenseResult, machineId: string | null): LicenseInfo {
    if (result.ok) return { state: "ok", customer: result.payload.customer, expiresAt: result.payload.expiresAt, machineId };
    return { state: result.reason, customer: null, expiresAt: null, machineId };
}

function main(): void {
    let machineId: string | null = null;
    try {
        machineId = readMachineId();
    } catch {
        machineId = null;
    }
    console.log("@@JSON@@" + JSON.stringify(describeLicense(checkLicense(), machineId)));
}

// Chỉ chạy khi là điểm vào: test nạp file này để thử hàm thuần.
if (path.basename(process.argv[1] ?? "").startsWith("license-info")) main();
