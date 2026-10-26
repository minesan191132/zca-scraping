import { checkLicense, readMachineId, type LicenseFailure, type LicenseResult } from "./license.js";

/** Cổng giấy phép của các CLI điều khiển Zalo. Máy tác giả (chạy từ mã nguồn, không `ZBOT_BUNDLED`) không bị chặn. */
export type GateResult = { allow: true } | { allow: false; message: string; exitCode: 3 };

const HOW_TO_GET = 'Hãy gửi "mã máy" này cho nhà cung cấp để nhận giấy phép, rồi nhập giấy phép trong ứng dụng.';

const TEXT: Record<LicenseFailure, string> = {
    missing: "Chưa có giấy phép.",
    "bad-format": "File giấy phép bị hỏng hoặc sai định dạng. Hãy nhập lại file giấy phép gốc.",
    "bad-signature": "Giấy phép không hợp lệ (chữ ký sai hoặc file đã bị sửa). Hãy nhập lại file giấy phép gốc.",
    "wrong-machine": "Giấy phép này cấp cho máy khác.",
    "machine-unreadable": "Không đọc được mã máy của máy này (MachineGuid trong registry), nên không kiểm được giấy phép. Hãy chạy ứng dụng bằng tài khoản Windows thường của bạn và thử lại; nếu vẫn lỗi, báo nhà cung cấp.",
    expired: "Giấy phép đã hết hạn. Hãy liên hệ nhà cung cấp để gia hạn.",
};

export function licenseGate(env: NodeJS.ProcessEnv, check: () => LicenseResult, machineId: () => string | null = () => null): GateResult {
    if (env.ZBOT_BUNDLED !== "1") return { allow: true };
    const r = check();
    if (r.ok) return { allow: true };
    let message = `[license] ${TEXT[r.reason]}`;
    if (r.reason === "missing" || r.reason === "wrong-machine") {
        const id = machineId();
        message += ` ${HOW_TO_GET}${id ? ` Mã máy: ${id}` : ""}`;
    }
    return { allow: false, message, exitCode: 3 };
}

function safeMachineId(): string | null {
    try {
        return readMachineId();
    } catch {
        return null;
    }
}

/** Gọi ở dòng đầu của `main` trước khi lấy `scrape.lock` hay chạm Zalo. Biểu thức `process.env.ZBOT_BUNDLED` giữ nguyên chữ để esbuild thay lúc dựng. */
export function requireLicense(): void {
    const gate = licenseGate({ ZBOT_BUNDLED: process.env.ZBOT_BUNDLED }, () => checkLicense(), safeMachineId);
    if (!gate.allow) {
        console.error(gate.message);
        process.exit(gate.exitCode);
    }
}
