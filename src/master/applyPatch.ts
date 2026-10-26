import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { outputDir, scriptsDir } from "../core/paths.js";
import type { PatchCell } from "./masterPatch.js";

/**
 * Chạy `scripts/patch-master.ps1` cho ĐÚNG một file (một tiến trình PowerShell riêng, như `runFillTemplate`). Ném lỗi khi PowerShell thoát khác 0 hoặc hết giờ. Khi hết giờ
 * `execFileSync` chỉ giết PowerShell còn EXCEL.EXE do COM khởi động vẫn sống và giữ file, nên đọc PID mà script ghi vào "<log>.pid" và giết đúng instance đó.
 */
export function applyPatchWithExcel(file: string, cells: PatchCell[], timeoutMs = 3 * 60_000): void {
    fs.mkdirSync(outputDir, { recursive: true });
    const tag = path.basename(file).replace(/[^A-Za-z0-9]+/g, "_");
    const specFile = path.join(outputDir, `patch-master-${tag}.json`);
    const logFile = path.join(outputDir, `patch-master-${tag}.log`);
    const pidFile = `${logFile}.pid`;
    fs.writeFileSync(specFile, JSON.stringify({ file, cells: cells.map((c) => ({ sheet: c.sheet, cell: c.cell, value: c.value })) }), "utf8");
    fs.rmSync(logFile, { force: true });
    fs.rmSync(pidFile, { force: true });
    try {
        execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(scriptsDir, "patch-master.ps1"), "-Spec", specFile, "-Log", logFile], { stdio: "inherit", timeout: timeoutMs });
    } catch (err) {
        killLeftoverExcel(pidFile);
        throw err;
    }
}

function killLeftoverExcel(pidFile: string): void {
    try {
        const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
        if (Number.isInteger(pid) && pid > 0) execFileSync("taskkill", ["/PID", String(pid), "/F", "/T"], { stdio: "ignore" });
    } catch {
        /* không có tệp PID hoặc tiến trình đã thoát */
    }
    fs.rmSync(pidFile, { force: true });
}
