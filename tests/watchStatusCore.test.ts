import { test } from "node:test";
import assert from "node:assert/strict";
import { formatWatchStatusCore } from "../src/cli/watch-status-core.js";
import { STALE_AFTER_MS } from "../src/watch/watchState.js";
import type { WatchState } from "../src/types/index.js";

// Bản chép của parseStatus ở panel/src/main/status-parse.ts (nguồn): tsc của gốc không biên dịch được file panel (bí danh @shared/*).
// Các cụm phải khớp panel (tests/dispatchStatus.test.ts kiểm panel còn chứa chúng).
interface PanelParsed {
    state: "alive" | "warn" | "stopped" | "dead";
    kind: "stopped" | "dead" | "never" | "blind" | "error" | "running" | "unknown";
    time: string | null;
    since: string | null;
    pid: number | null;
}

const BOT_LINE = /^\[(watch|runner|chat|total)\]/;

function parseStatus(_exitCode: number, text: string): PanelParsed {
    const lines = text.split(/\r?\n/);
    const headline = lines.find((l) => BOT_LINE.test(l)) ?? lines[0] ?? "";
    const pid = headline.match(/pid (\d+)/)?.[1];
    const time = headline.match(/\b(\d{2}:\d{2})\b/)?.[1] ?? null;
    const base = { time: null, since: null, pid: pid ? Number(pid) : null };

    if (/ĐÃ DỪNG/.test(headline)) return { ...base, state: "stopped", kind: "stopped", time };
    if (/CÓ VẺ ĐÃ CHẾT/.test(headline)) return { ...base, state: "dead", kind: "dead", time };
    if (/chưa từng chạy|chưa có dữ liệu/.test(headline)) return { ...base, state: "dead", kind: "never" };
    if (/ĐANG CHẠY NHƯNG MÙ/.test(headline)) return { ...base, state: "warn", kind: "blind", time };
    if (/\bLỖI\b/.test(headline) && pid) return { ...base, state: "warn", kind: "error" };
    if (/ĐANG CHẠY/.test(headline)) {
        const since = headline.match(/từ (\d{2}\/\d{2} \d{2}:\d{2}|\d{2}:\d{2})/)?.[1] ?? null;
        return { ...base, state: "alive", kind: "running", since };
    }
    return { ...base, state: "dead", kind: "unknown" };
}


const NOW = Date.parse("2026-10-24T05:00:00.000Z");
const base: WatchState = { pid: 777, startedAt: NOW - 3_600_000, lastBeat: NOW - 1000, state: "running", detections: 3, sources: { ws: "active" } };
const parse = (state: WatchState | null) => parseStatus(0, formatWatchStatusCore({ state, now: NOW }).join("\n"));

test("đang chạy: alive/running, có pid", () => {
    const p = parse(base);
    assert.equal(p.state, "alive");
    assert.equal(p.kind, "running");
    assert.equal(p.pid, 777);
});

test("đang chạy nhưng mù: warn/blind", () => {
    const p = parse({ ...base, blindSince: NOW - 60_000 });
    assert.equal(p.state, "warn");
    assert.equal(p.kind, "blind");
});

test("đã dừng: stopped", () => {
    assert.equal(parse({ ...base, state: "stopped", stoppedAt: NOW - 5000 }).kind, "stopped");
});

test("nhịp tim cũ: dead", () => {
    const p = parse({ ...base, lastBeat: NOW - STALE_AFTER_MS - 1000 });
    assert.equal(p.kind, "dead");
    assert.equal(p.pid, 777);
});

test("chưa có trạng thái: never", () => {
    assert.equal(parse(null).kind, "never");
});
