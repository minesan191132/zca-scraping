import path from "node:path";
import { config } from "../../config.js";
import { setOutputDir } from "../core/paths.js";
import { maintenanceEntries } from "../lesson/maintenanceReport.js";
import { hhmmVietnam, todayVietnam, vietnamDay } from "../lesson/time.js";
import { applyPatchWithExcel } from "../master/applyPatch.js";
import { LOOKBACK_DAYS, recentDays } from "../master/lookback.js";
import { indexMaster } from "../master/masterIndex.js";
import { maintenancePatch } from "../master/masterPatch.js";
import { findPreviousMaster, masterBackupDirFor, masterDirFor } from "../master/masterStore.js";
import { summarize } from "../master/runMasterCli.js";
import { updateMaster } from "../master/updateMaster.js";
import { loadReportSets, logSetProblems, pickSet, requireKey } from "../reportSets/cliSet.js";
import { MessageStore } from "../store/messageStore.js";
import type { SourceMessage } from "../types/index.js";

/**
 * Cập nhật FILE TỔNG "THỜI GIAN CHƯA BẢO TRÌ PM" của bộ từ các tin "CÔNG VIỆC CUỐI CA LÀM" của HÔM NAY và `LOOKBACK_DAYS` ngày trước: ô BẢO TRÌ GN của đúng dòng trường = ngày của tin (không lùi ngày). File tổng nằm ở
 * `<statusExportDir>/<yyMM>/<yyMMdd>/<bộ>/` (cùng thư mục với báo cáo khác của bộ; sang ngày mới chép từ file tổng ngày trước), luôn có sao lưu trước khi ghi; tin không khớp dòng nào ghi vào `output/<bộ>/master-review.maintenance.json`. Chạy một lần mỗi chu trình `bot:runner`.
 *
 *   npm run fill:maintenance-report -- [--set <id>] [--now <unix ms>] [--dry-run]
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
    requireKey(set, "maintenance");
    const now = Number(option("--now") ?? Date.now());
    const day = todayVietnam(now);
    const dryRun = process.argv.includes("--dry-run");

    // Xét lại `LOOKBACK_DAYS` ngày gần nhất, cũ trước: cứu tin của ngày trước khi chu trình cuối ngày lỗi; ô không bao giờ lùi ngày nên xử lý lại vô hại.
    const all = await loadAllMessages();
    const entries = recentDays(day, LOOKBACK_DAYS).flatMap((d) => maintenanceEntries(all, (ts) => vietnamDay(ts) === d));
    const result = updateMaster(
        {
            kind: "maintenance",
            dir: masterDirFor(config.statusExportDir, set.id, day),
            previous: findPreviousMaster("maintenance", config.statusExportDir, set.id, day),
            templatesDir: path.join(config.dataDir, "mau bao cao new"),
            backupDir: masterBackupDirFor(config.dataDir, set.id),
            reviewFile: path.join(setOutputDir(set.id), "master-review.maintenance.json"),
            day,
            hhmm: hhmmVietnam(now),
            dryRun,
            build: (rows) => maintenancePatch(entries, rows),
        },
        { index: indexMaster, patch: applyPatchWithExcel },
    );
    for (const line of summarize("maintenance", set.id, day, result, dryRun)) console.log(line);
}

main().catch((err) => {
    console.error((err as Error).message);
    process.exit(1);
});
