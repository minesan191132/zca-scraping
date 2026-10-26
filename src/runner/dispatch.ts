import { runQueuedScrape, type QueueRunDeps } from "../scrape/queueRun.js";

/**
 * Một vòng của bộ điều phối mỏng: cào đúng các nhóm trong hàng chờ rồi gọi móc `afterScrape` (chỗ cắm bộ máy báo cáo).
 * Không dựng báo cáo, không đồng bộ DB, không đọc ảnh: những việc đó thuộc `bot:runner` của bản gốc.
 */
export interface DispatchDeps {
    queue: QueueRunDeps;
    /** Gọi sau khi cào xong, với các nhóm đã cào. Lỗi của nó chỉ ghi log, không đổi kết quả cào. */
    afterScrape?(targets: string[]): Promise<void>;
    log(message: string): void;
}

export type DispatchResult = { status: "idle" | "done" | "failed"; failed: string[] };

/** `scrape` ném lỗi (Zalo không mở được) thì lỗi đi tiếp lên; hàng chờ không bị đánh dấu, như `runQueuedScrape`. */
export async function runDispatchCycle(deps: DispatchDeps): Promise<DispatchResult> {
    const result = await runQueuedScrape(deps.queue);
    if (result.status === "empty") return { status: "idle", failed: [] };
    if (deps.afterScrape) {
        try {
            await deps.afterScrape(result.targets);
        } catch (err) {
            deps.log(`[dispatch] móc afterScrape lỗi: ${(err as Error).message}`);
        }
    }
    return { status: result.failed.length > 0 ? "failed" : "done", failed: result.failed };
}

/** Hàng chờ: số nhóm và lúc nhóm đầu/cuối được xếp vào (ms). */
export interface DispatchQueueTimes {
    count: number;
    firstQueuedAt: number;
    lastQueuedAt: number;
}

export type DispatchDecision = { action: "idle" } | { action: "run"; reason: "quiet" | "max-wait" } | { action: "wait"; runAt: number };

/**
 * Giống `decide` của `src/runner/schedule.ts` nhưng không import nó: `schedule.ts` kéo `lesson/` (cửa sổ phục hồi, giờ
 * theo buổi) vào gói, mà bản gộp của Beta không được chứa `lesson/`. Hai bên giữ cùng luật: yên `quietMs` thì chạy,
 * chờ tối đa `maxWaitMs` kể từ nhóm đầu.
 */
export function decideDispatch(q: DispatchQueueTimes, now: number, quietMs: number, maxWaitMs: number): DispatchDecision {
    if (q.count === 0) return { action: "idle" };
    if (now - q.lastQueuedAt >= quietMs) return { action: "run", reason: "quiet" };
    if (now - q.firstQueuedAt >= maxWaitMs) return { action: "run", reason: "max-wait" };
    return { action: "wait", runAt: Math.min(q.lastQueuedAt + quietMs, q.firstQueuedAt + maxWaitMs) };
}

/** Như `toQueueTimes` của `schedule.ts`: nhóm không có giờ ghi lại tính là xếp lúc `fallback`. */
export function dispatchQueueTimes(queue: string[], meta: Record<string, number>, fallback: number, seen: Record<string, number> = {}): DispatchQueueTimes {
    if (queue.length === 0) return { count: 0, firstQueuedAt: fallback, lastQueuedAt: fallback };
    const first = queue.map((t) => (typeof meta[t] === "number" ? meta[t] : fallback));
    const last = queue.map((t, i) => Math.max(first[i], typeof seen[t] === "number" ? seen[t] : first[i]));
    return { count: queue.length, firstQueuedAt: Math.min(...first), lastQueuedAt: Math.max(...last) };
}
