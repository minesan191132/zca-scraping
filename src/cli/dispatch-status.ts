import path from "node:path";
import { readQueue } from "../scrape/scrapeQueue.js";
import { readRunnerState, runnerHealth } from "../runner/runnerState.js";
import { hhmm } from "../watch/watchStatusReport.js";
import type { RunnerState } from "../types/index.js";

/**
 * Trạng thái của `bot-dispatch` (bản gộp của bộ điều phối), chỉ đọc. Bản gộp được vì không kéo `reportSets/`, `lesson/` hay `runner/steps`
 * như `runner:status`. Dòng đầu theo đúng các cụm mà panel nhận (`panel/src/main/status-parse.ts`). Thoát mã 0 khi đang chạy, 2 khi còn lại.
 *
 *   node dist/cli/dispatch-status.js
 */
function ago(ms: number): string {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s} giây`;
    const m = Math.floor(s / 60);
    return m < 60 ? `${m} phút` : `${Math.floor(m / 60)} giờ ${m % 60} phút`;
}

export function formatDispatchStatus(input: { state: RunnerState | null; queue: string[]; now: number }): string[] {
    const { state, queue, now } = input;
    const lines: string[] = [];
    const health = runnerHealth(state, now);

    if (!state) {
        lines.push("[runner] chưa từng chạy: không có dữ liệu nhịp tim của bộ điều phối.");
    } else if (health === "stopped") {
        lines.push(`[runner] ĐÃ DỪNG lúc ${hhmm(state.lastBeat)}`);
    } else if (health === "dead") {
        lines.push(`[runner] CÓ VẺ ĐÃ CHẾT: nhịp tim cuối lúc ${hhmm(state.lastBeat)} (${ago(now - state.lastBeat)} trước), tiến trình pid ${state.pid} không còn báo.`);
    } else if (health === "error") {
        lines.push(`[runner] LỖI (pid ${state.pid}): ${state.consecutiveFailures} vòng liên tiếp thất bại, bộ điều phối đã ngừng tự thử. Hãy khởi động lại.`);
    } else {
        lines.push(`[runner] ĐANG CHẠY (pid ${state.pid}) từ ${hhmm(state.startedAt)}`);
        lines.push(`  trạng thái: ${state.state}`);
        lines.push(`  nhịp tim cuối: ${ago(now - state.lastBeat)} trước`);
    }

    lines.push(`  hàng chờ: ${queue.length} nhóm${queue.length > 0 ? ` (${queue.join(", ")})` : ""}`);
    const c = state?.lastCycle;
    if (c) lines.push(`  vòng gần nhất lúc ${hhmm(c.at)}: ${c.ok ? "OK" : "LỖI"}${c.groups.length > 0 ? `, nhóm: ${c.groups.join(", ")}` : ""}`);
    return lines;
}

function main(): void {
    const now = Date.now();
    const state = readRunnerState();
    for (const line of formatDispatchStatus({ state, queue: readQueue(), now })) console.log(line);
    if (runnerHealth(state, now) !== "alive") process.exitCode = 2;
}

// Chỉ chạy khi là điểm vào: test nạp file này để thử hàm thuần.
if (path.basename(process.argv[1] ?? "").startsWith("dispatch-status")) main();
