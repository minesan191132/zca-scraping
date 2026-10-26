import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { formatDispatchStatus } from "../src/cli/dispatch-status.js";
import { STALE_AFTER_MS } from "../src/watch/watchState.js";
import type { RunnerState } from "../src/types/index.js";

// Bản chép của parseStatus ở panel/src/main/status-parse.ts (nguồn): tsc của gốc không biên dịch được file panel (bí danh @shared/*).
// Các cụm phải khớp panel; test cuối kiểm panel còn chứa đúng các cụm này.
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
const base: RunnerState = { pid: 4242, startedAt: NOW - 3_600_000, lastBeat: NOW - 1000, state: "idle", consecutiveFailures: 0 };
const head = (state: RunnerState | null, queue: string[] = []) => formatDispatchStatus({ state, queue, now: NOW });

test("đang chạy: panel đọc ra alive/running, có pid và giờ bắt đầu", () => {
    const lines = head(base, ["Nhom A", "Nhom B"]);
    const p = parseStatus(0, lines.join("\n"));
    assert.equal(p.state, "alive");
    assert.equal(p.kind, "running");
    assert.equal(p.pid, 4242);
    assert.match(p.since ?? "", /^\d{2}:\d{2}/);
    assert.ok(lines.some((l) => l.includes("hàng chờ: 2 nhóm")));
});

test("đã dừng: panel đọc ra stopped", () => {
    const p = parseStatus(2, head({ ...base, state: "stopped" }).join("\n"));
    assert.equal(p.kind, "stopped");
    assert.match(p.time ?? "", /^\d{2}:\d{2}$/);
});

test("nhịp tim cũ: panel đọc ra dead, có pid", () => {
    const p = parseStatus(2, head({ ...base, lastBeat: NOW - STALE_AFTER_MS - 1000 }).join("\n"));
    assert.equal(p.state, "dead");
    assert.equal(p.kind, "dead");
    assert.equal(p.pid, 4242);
});

test("lỗi liên tiếp: panel đọc ra warn/error, có pid", () => {
    const p = parseStatus(2, head({ ...base, state: "error", consecutiveFailures: 3 }).join("\n"));
    assert.equal(p.state, "warn");
    assert.equal(p.kind, "error");
    assert.equal(p.pid, 4242);
});

test("chưa có trạng thái: panel đọc ra never", () => {
    const lines = head(null);
    const p = parseStatus(2, lines.join("\n"));
    assert.equal(p.kind, "never");
    assert.ok(lines.some((l) => l.includes("hàng chờ: 0 nhóm")));
});

test("panel còn chứa đúng các cụm dòng đầu mà bản chép ở trên dùng", () => {
    const file = path.resolve(import.meta.dirname, "..", "panel", "src", "main", "status-parse.ts");
    if (!fs.existsSync(file)) return;
    const src = fs.readFileSync(file, "utf8");
    const missing = ["ĐÃ DỪNG", "CÓ VẺ ĐÃ CHẾT", "chưa từng chạy", "ĐANG CHẠY NHƯNG MÙ", "ĐANG CHẠY", "LỖI"].filter((p) => !src.includes(p));
    assert.deepEqual(missing, []);
});
