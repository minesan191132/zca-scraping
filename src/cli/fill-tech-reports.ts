import fs from "node:fs";
import path from "node:path";
import { config } from "../../config.js";
import { setReportDir } from "../core/paths.js";
import { loadReportSets, logSetProblems, pickSet } from "../reportSets/cliSet.js";
import { dayBuiltPath, dayNeedsRebuild, readDayBuilt, rowsSignature, writeDayBuilt } from "../lesson/dayReportState.js";
import { runFillReplacingSameDay } from "../lesson/excelFill.js";
import { freeFormFileName, readTemplateTitle } from "../lesson/statusReportLayout.js";
import { TECH_KEYS } from "../lesson/techReport.js";
import { hhmmVietnam, todayVietnam } from "../lesson/time.js";
import { rowsInWindow } from "../definitions/engine.js";
import { buildFillParts } from "../definitions/fillParts.js";
import { customDefinitionsDir, loadDefinitions, withConfigCutoffs } from "../definitions/loader.js";
import { reviewPath, writeReview } from "../definitions/review.js";
import { MessageStore } from "../store/messageStore.js";
import type { ReportKey } from "../reportSets/registry.js";
import type { SourceMessage } from "../types/index.js";

/**
 * Dựng các báo cáo kỹ thuật mà bộ `--set` bật (attendanceStart, attendanceEnd, shiftStart, shiftEnd) từ tin của HÔM NAY, mỗi báo cáo một file
 * `<tiêu đề>_<yyMMdd>_T<thứ>_<HHmm>.xlsx` trong thư mục của bộ (mẫu BAO CAO KY THUAT.xlsx, ba sheet còn lại bị xoá khỏi file). Mỗi tin một dòng;
 * chỉ lấy tin gửi trong ngày đến mốc giờ của báo cáo (`config.techReports`). Chỉ dựng lại khi các dòng đổi (hoặc sang ngày mới, hoặc file mất; `--force`
 * bắt dựng lại). Một báo cáo lỗi không chặn các báo cáo còn lại; có lỗi thì thoát mã 1 và runner coi là cảnh báo.
 * Xem docs/superpowers/specs/2026-10-22-4-bao-cao-ky-thuat-moi-design.md.
 *
 *   npm run fill:tech-reports -- [--set <id>] [--now <unix ms>] [--force]
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
    const keys = TECH_KEYS.filter((k) => set.reports.includes(k as ReportKey));
    if (keys.length === 0) throw new Error(`bộ "${set.id}" không bật báo cáo kỹ thuật nào (reports: ${set.reports.join(", ")}).`);
    const now = Number(option("--now") ?? Date.now());
    const day = todayVietnam(now);
    const force = process.argv.includes("--force");
    const reporter = set.reporterName;

    const messages = await loadAllMessages();
    const templatesSrc = path.join(config.dataDir, "mau bao cao new");
    const yyMMdd = day.slice(2, 4) + day.slice(5, 7) + day.slice(8, 10);
    const outDir = setReportDir(config.statusExportDir, set.id, day);
    const failures: string[] = [];
    // Mốc giờ của bốn báo cáo vẫn đặt ở config.techReports (withConfigCutoffs); định nghĩa của khách nằm ở <dataDir>/definitions.
    const loaded = loadDefinitions(customDefinitionsDir());
    for (const problem of loaded.problems) console.warn(`[fill-tech-reports] định nghĩa: ${problem}`);
    const defs = new Map(withConfigCutoffs(loaded.defs).map((d) => [d.code, d]));

    for (const key of keys) {
        try {
            const def = defs.get(key);
            if (!def) throw new Error(`không có định nghĩa cho mã "${key}"`);
            const { rows, review } = rowsInWindow(def, messages, day);
            // Tin đúng tiêu đề mà thiếu nhãn bắt buộc không bị bỏ lặng lẽ: ghi ra file cần xem (rỗng thì xoá file).
            try {
                writeReview(reviewPath(set.id, key, day), review);
            } catch (err) {
                // Ghi file cần xem lỗi (thư mục khoá, mất quyền) không được làm báo cáo của mã này không dựng được.
                console.warn(`[fill-tech-reports] bộ ${set.id}, ${key}: không ghi được file cần xem: ${(err as Error).message}`);
            }
            if (review.length > 0) console.warn(`[fill-tech-reports] bộ ${set.id}, ${key}: ${review.length} tin thiếu nhãn bắt buộc, xem ${reviewPath(set.id, key, day)}`);
            const stateFile = dayBuiltPath(key, set.id);
            const signature = rowsSignature([...rows, { reporter: reporter ?? null }]);
            const prev = readDayBuilt(stateFile);
            if (!force && !dayNeedsRebuild(prev, day, signature, (name) => fs.existsSync(path.join(outDir, name)))) {
                console.log(`[fill-tech-reports] bộ ${set.id}, ${key}, ngày ${day}: không có tin mới, giữ nguyên ${prev!.file}`);
                continue;
            }
            fs.mkdirSync(outDir, { recursive: true });
            const parts = buildFillParts(def, rows, day, reporter);
            const title = readTemplateTitle(path.join(templatesSrc, parts.layout.templateFile), parts.layout.sheet);
            const outName = freeFormFileName(title, day, hhmmVietnam(now));
            // Ghi file mới xong mới xoá bản cũ cùng ngày (runFillReplacingSameDay): lỗi giữa chừng không làm mất bản cũ.
            runFillReplacingSameDay({
                name: `tech-${key}`,
                templatesSrc,
                layout: parts.layout,
                outDir,
                outName,
                rows: parts.rows,
                headerCells: parts.headerCells,
                formulaCells: parts.formulaCells,
            }, `${title}_${yyMMdd}_T`);
            writeDayBuilt({ day, signature, file: outName }, stateFile);
            console.log(`[fill-tech-reports] bộ ${set.id}, ${key}, ngày ${day}: ${rows.length} dòng -> ${path.join(outDir, outName)}`);
        } catch (err) {
            failures.push(`${key}: ${(err as Error).message}`);
            console.error(`[fill-tech-reports] bộ ${set.id}, ${key}: ${(err as Error).message}`);
        }
    }
    if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
    console.error((err as Error).message);
    process.exit(1);
});
