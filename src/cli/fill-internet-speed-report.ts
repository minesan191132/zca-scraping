import path from "node:path";
import { config } from "../../config.js";
import { setOutputDir } from "../core/paths.js";
import { internetSpeedEntries } from "../lesson/internetSpeedReport.js";
import { hhmmVietnam, todayVietnam, vietnamDay } from "../lesson/time.js";
import { applyPatchWithExcel } from "../master/applyPatch.js";
import { LOOKBACK_DAYS, recentDays } from "../master/lookback.js";
import { indexMaster } from "../master/masterIndex.js";
import { internetSpeedPatch } from "../master/masterPatch.js";
import { findPreviousMaster, masterBackupDirFor, masterDirFor } from "../master/masterStore.js";
import { summarize } from "../master/runMasterCli.js";
import { updateMaster } from "../master/updateMaster.js";
import { loadReportSets, logSetProblems, pickSet, requireKey } from "../reportSets/cliSet.js";
import { MessageStore } from "../store/messageStore.js";
import type { SourceMessage } from "../types/index.js";

/**
 * Cập nhật FILE TỔNG "TRẠNG THÁI KẾT NỐI INTERNET" của bộ từ các tin "CÔNG VIỆC CUỐI CA LÀM" của HÔM NAY và `LOOKBACK_DAYS` ngày trước: với mỗi PHÒNG MÁY ghi TỐC ĐỘ (Mbps, từ dòng chữ "Tốc độ Internet" của tin; trống hoặc 0 thì 0, chữ không có số thì
 * không ghi) và NGÀY CẬP NHẬT vào đúng dòng (trường, phòng). Cột XẾP LOẠI là công thức của file nên tự tính. File tổng nằm ở `<statusExportDir>/<yyMM>/<yyMMdd>/<bộ>/` (cùng thư mục với báo cáo khác của bộ; sang ngày mới chép từ file tổng ngày trước), luôn
 * sao lưu trước khi ghi; mục không khớp dòng nào ghi vào `output/<bộ>/master-review.internetSpeed.json`. Chạy một lần mỗi chu trình `bot:runner` . Không đọc ảnh, không gọi agent.
 *
 *   npm run fill:internet-speed-report -- [--set <id>] [--now <unix ms>] [--dry-run]
 */
async function loadAllMessages(): Promise<SourceMessage[]> {
    const store = new MessageStore();
    const all: SourceMessage[] = [];
    for (const groupId of store.listThreads()) all.push(...(await store.readThread(groupId)));
    return all;
}

function option(name: string): string | undefined {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
    const sets = loadReportSets();
    logSetProblems(sets.problems);
    const set = pickSet(sets.active, option("--set"));
    requireKey(set, "internetSpeed");
    const now = Number(option("--now") ?? Date.now());
    const day = todayVietnam(now);
    const dryRun = process.argv.includes("--dry-run");

    // Xét lại `LOOKBACK_DAYS` ngày gần nhất, cũ trước (xem fill-maintenance-report).
    const all = await loadAllMessages();
    const entries = recentDays(day, LOOKBACK_DAYS).flatMap((d) => internetSpeedEntries(all, (ts) => vietnamDay(ts) === d));
    const result = updateMaster(
        {
            kind: "internetSpeed",
            dir: masterDirFor(config.statusExportDir, set.id, day),
            previous: findPreviousMaster("internetSpeed", config.statusExportDir, set.id, day),
            templatesDir: path.join(config.dataDir, "mau bao cao new"),
            backupDir: masterBackupDirFor(config.dataDir, set.id),
            reviewFile: path.join(setOutputDir(set.id), "master-review.internetSpeed.json"),
            day,
            hhmm: hhmmVietnam(now),
            dryRun,
            build: (rows) => internetSpeedPatch(entries, rows),
        },
        { index: indexMaster, patch: applyPatchWithExcel },
    );
    for (const line of summarize("internetSpeed", set.id, day, result, dryRun)) console.log(line);
}

main().catch((err) => {
    console.error((err as Error).message);
    process.exit(1);
});
