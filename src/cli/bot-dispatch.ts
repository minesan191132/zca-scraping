import { acquireScrapeLock, releaseScrapeLock } from "../core/scrapeLock.js";
import { runScrape } from "../scrape/desktopScraper.js";
import { completeSnapshot, importLegacyQueue, readQueue, readQueueMeta, readQueueSeen, takeSnapshot } from "../scrape/scrapeQueue.js";
import { MessageStore } from "../store/messageStore.js";
import { decideDispatch, dispatchQueueTimes, runDispatchCycle } from "../runner/dispatch.js";
import { beatRunner, readRunnerState, recordCycle, setPhase, startRunner, stopRunner } from "../runner/runnerState.js";
import { config } from "../../config.js";
import { requireLicense } from "../core/licenseGate.js";
import { HEARTBEAT_INTERVAL_MS } from "../watch/watchState.js";
import type { CycleSummary } from "../types/index.js";

/**
 * Bộ điều phối mỏng của bản Beta: hàng chờ yên `QUIET_MS` (tối đa `MAX_WAIT_MS` kể từ nhóm đầu) thì cào các nhóm
 * trong hàng chờ, rồi gọi móc `afterScrape` (hiện để trống: chỗ cắm bộ máy báo cáo ở plan sau). Giữ `data/.scrape.lock`
 * trong lúc cào. Ghi trạng thái vào cùng file với `bot:runner` để `runner:status` và panel đọc được.
 *
 *   node dist/cli/bot-dispatch.js
 */
const QUIET_MS = config.runner.quietSeconds * 1000;
const MAX_WAIT_MS = config.runner.maxWaitSeconds * 1000;
const POLL_MS = config.runner.pollSeconds * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (m: string) => console.log(`${new Date().toISOString()} ${m}`);

async function main(): Promise<void> {
    requireLicense();
    const started = startRunner(Date.now(), process.pid);
    if (started.anotherInstanceAlive) {
        console.error("[dispatch] đang có một bộ điều phối khác chạy — thoát.");
        process.exit(1);
    }

    const shutdown = (code: number) => {
        stopRunner(Date.now());
        releaseScrapeLock();
        process.exit(code);
    };
    process.on("SIGINT", () => shutdown(0));
    process.on("SIGTERM", () => shutdown(0));
    process.on("uncaughtException", (err) => {
        console.error("[dispatch] lỗi nặng:", err);
        shutdown(1);
    });
    process.on("unhandledRejection", (err) => {
        console.error("[dispatch] lỗi nặng:", err);
        shutdown(1);
    });
    setInterval(() => beatRunner(Date.now()), HEARTBEAT_INTERVAL_MS);

    const store = new MessageStore();
    const startedAt = Date.now();
    const imported = importLegacyQueue();
    if (imported > 0) log(`[dispatch] đã nhập ${imported} nhóm từ hàng chờ cũ sang hàng chờ mới.`);
    log("[dispatch] đang chạy, chờ việc.");

    for (;;) {
        await sleep(POLL_MS);
        const now = Date.now();
        const state = readRunnerState();
        if (state?.state === "error") continue; // đã ngừng vì lỗi liên tiếp: chỉ khởi động lại mới xoá

        const decision = decideDispatch(dispatchQueueTimes(readQueue(), readQueueMeta(), startedAt, readQueueSeen()), now, QUIET_MS, MAX_WAIT_MS);
        if (decision.action !== "run") {
            setPhase(now, decision.action === "wait" ? "waiting" : "idle");
            continue;
        }

        const lock = acquireScrapeLock("bot:dispatch");
        if (!lock.ok) {
            log(`[dispatch] "${lock.heldBy.owner}" (pid ${lock.heldBy.pid}) đang điều khiển Zalo Desktop, thử lại sau.`);
            continue;
        }
        setPhase(now, "running");
        const summary: CycleSummary = { kind: "cycle", at: now, ok: true, groups: [], sessions: [], reviewCount: 0, excel: [], warnings: [], errors: [], buildErrors: [] };
        try {
            log(`[dispatch] bắt đầu vòng (hàng chờ: ${decision.reason}).`);
            const result = await runDispatchCycle({
                queue: {
                    takeSnapshot: () => takeSnapshot(),
                    complete: (snapshot, failed) => completeSnapshot(snapshot, { failed }),
                    scrape: (targets) => runScrape(store, targets),
                    log,
                },
                // Chỗ cắm bộ máy báo cáo (plan sau); hiện chỉ ghi lại các nhóm đã cào vào trạng thái.
                afterScrape: async (targets) => {
                    summary.groups = targets;
                },
                log,
            });
            if (result.status === "failed") summary.warnings.push(`nhóm cào lỗi: ${result.failed.join(", ")}`);
        } catch (err) {
            summary.ok = false;
            summary.errors.push((err as Error).message);
        } finally {
            releaseScrapeLock();
        }
        summary.durationMs = Date.now() - now;
        const after = recordCycle(Date.now(), summary);
        log(`[dispatch] vòng xong sau ${(summary.durationMs / 1000).toFixed(1)} s: ${summary.ok ? "OK" : "LỖI"}${summary.errors.length > 0 ? `, lỗi: ${summary.errors.join("; ")}` : ""}`);
        if (after.state === "error") log(`[dispatch] ${after.consecutiveFailures} vòng lỗi liên tiếp, ngừng tự thử. Sửa nguyên nhân rồi khởi động lại.`);
    }
}

main().catch((err) => {
    console.error(err);
    stopRunner(Date.now());
    releaseScrapeLock();
    process.exit(1);
});
