import path from "node:path";
import { readState, STALE_AFTER_MS } from "../watch/watchState.js";
import { hhmm } from "../watch/watchStatusReport.js";
import type { WatchState } from "../types/index.js";

/**
 * Trạng thái của `bot-watch-core` (bản gộp), chỉ đọc. Khác `watch:status` ở chỗ không phân tích khoảng hở (cần `lesson/recovery`).
 * Dòng đầu theo đúng các cụm mà panel nhận (`panel/src/main/status-parse.ts`).
 *
 *   node dist/cli/watch-status-core.js
 */
function ago(ms: number): string {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s} giây`;
    const m = Math.floor(s / 60);
    return m < 60 ? `${m} phút` : `${Math.floor(m / 60)} giờ ${m % 60} phút`;
}

export function formatWatchStatusCore(input: { state: WatchState | null; now: number }): string[] {
    const { state, now } = input;
    const lines: string[] = [];

    if (!state) {
        lines.push("[watch] chưa từng chạy: không có dữ liệu nhịp tim của bot-watch.");
    } else if (state.state === "stopped") {
        lines.push(`[watch] ĐÃ DỪNG lúc ${hhmm(state.stoppedAt ?? state.lastBeat)}`);
    } else if (now - state.lastBeat > STALE_AFTER_MS) {
        lines.push(`[watch] CÓ VẺ ĐÃ CHẾT: nhịp tim cuối lúc ${hhmm(state.lastBeat)} (${ago(now - state.lastBeat)} trước), tiến trình pid ${state.pid} không còn báo.`);
    } else if (state.blindSince !== undefined) {
        lines.push(`[watch] ĐANG CHẠY NHƯNG MÙ (pid ${state.pid}): nguồn phát hiện (WebSocket) không hoạt động từ ${hhmm(state.blindSince)}`);
    } else {
        lines.push(`[watch] ĐANG CHẠY (pid ${state.pid}) từ ${hhmm(state.startedAt)}`);
    }

    if (state && state.state === "running" && now - state.lastBeat <= STALE_AFTER_MS) {
        lines.push(`  nhịp tim cuối: ${ago(now - state.lastBeat)} trước`);
        lines.push(`  nguồn phát hiện: WebSocket: ${state.sources.ws}`);
        if (state.lastFrameAt !== undefined) lines.push(`  khung WebSocket cuối: ${ago(now - state.lastFrameAt)} trước`);
        if (state.reconnects) lines.push(`  đã tự nối lại ${state.reconnects} lần`);
        lines.push(
            state.lastDetectionAt === undefined
                ? `  chưa phát hiện tin nào (tổng ${state.detections} lần)`
                : `  phát hiện gần nhất: ${hhmm(state.lastDetectionAt)} (tổng ${state.detections} lần)`,
        );
    }
    return lines;
}

function main(): void {
    for (const line of formatWatchStatusCore({ state: readState(), now: Date.now() })) console.log(line);
}

// Chỉ chạy khi là điểm vào: test nạp file này để thử hàm thuần.
if (path.basename(process.argv[1] ?? "").startsWith("watch-status-core")) main();
