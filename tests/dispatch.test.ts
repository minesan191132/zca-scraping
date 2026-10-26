import { test } from "node:test";
import assert from "node:assert/strict";
import { runDispatchCycle } from "../src/runner/dispatch.js";
import type { QueueRunDeps } from "../src/scrape/queueRun.js";
import type { QueueSnapshot, TargetOutcome } from "../src/types/index.js";

function fakeQueue(targets: string[], opts: { failed?: string[]; throwOnScrape?: boolean } = {}): { deps: QueueRunDeps; completed: string[][] } {
    const completed: string[][] = [];
    const snapshot: QueueSnapshot = { targets, mark: {} };
    const deps: QueueRunDeps = {
        takeSnapshot: () => snapshot,
        complete: (_s, failed) => {
            completed.push(failed);
            return { retrying: failed, gaveUp: [] };
        },
        scrape: async (list) => {
            if (opts.throwOnScrape) throw new Error("Zalo không trả lời");
            return list.map((target): TargetOutcome => (opts.failed?.includes(target) ? { target, error: "lỗi" } : { target }));
        },
        log: () => {},
    };
    return { deps, completed };
}

test("hàng chờ rỗng: idle và không gọi afterScrape", async () => {
    const { deps } = fakeQueue([]);
    let called = false;
    const r = await runDispatchCycle({ queue: deps, afterScrape: async () => void (called = true), log: () => {} });
    assert.equal(r.status, "idle");
    assert.deepEqual(r.failed, []);
    assert.equal(called, false);
});

test("cào được: done và afterScrape nhận đúng danh sách nhóm", async () => {
    const { deps } = fakeQueue(["A", "B"]);
    let got: string[] | null = null;
    const r = await runDispatchCycle({ queue: deps, afterScrape: async (t) => void (got = t), log: () => {} });
    assert.equal(r.status, "done");
    assert.deepEqual(got, ["A", "B"]);
});

test("scrape ném lỗi: runDispatchCycle ném tiếp, không đánh dấu hàng chờ", async () => {
    const { deps, completed } = fakeQueue(["A"], { throwOnScrape: true });
    await assert.rejects(() => runDispatchCycle({ queue: deps, log: () => {} }), /Zalo không trả lời/);
    assert.equal(completed.length, 0);
});

test("afterScrape ném lỗi: vẫn done, có một dòng log lỗi", async () => {
    const { deps } = fakeQueue(["A"]);
    const logs: string[] = [];
    const r = await runDispatchCycle({ queue: deps, afterScrape: async () => { throw new Error("hỏng móc"); }, log: (m) => logs.push(m) });
    assert.equal(r.status, "done");
    assert.equal(logs.filter((l) => l.includes("hỏng móc")).length, 1);
});

test("có nhóm lỗi: failed chứa nhóm đó", async () => {
    const { deps } = fakeQueue(["A", "B"], { failed: ["B"] });
    const r = await runDispatchCycle({ queue: deps, log: () => {} });
    assert.equal(r.status, "failed");
    assert.deepEqual(r.failed, ["B"]);
});

test("decideDispatch và dispatchQueueTimes cho cùng kết quả với decide và toQueueTimes của runner", async () => {
    const { decide, toQueueTimes } = await import("../src/runner/schedule.js");
    const { decideDispatch, dispatchQueueTimes } = await import("../src/runner/dispatch.js");
    const queue = ["A", "B", "C"];
    const meta = { A: 1000, B: 5000 };
    const seen = { A: 9000 };
    assert.deepEqual(dispatchQueueTimes(queue, meta, 2000, seen), toQueueTimes(queue, meta, 2000, seen));
    assert.deepEqual(dispatchQueueTimes([], {}, 7), toQueueTimes([], {}, 7));
    for (const now of [1000, 6000, 20_000, 400_000, 4_000_000]) {
        const q = toQueueTimes(queue, meta, 2000, seen);
        assert.deepEqual(decideDispatch(q, now, 30_000, 600_000), decide(q, now, 30_000, 600_000));
        assert.deepEqual(decideDispatch({ count: 0, firstQueuedAt: 0, lastQueuedAt: 0 }, now, 30_000, 600_000), { action: "idle" });
    }
});
