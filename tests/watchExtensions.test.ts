import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { handleRealtimeEvent } from "../src/watch/eventRouting.js";
import type { RealtimeMessageEvent } from "../src/types/index.js";

const event = { groupId: "g1" } as RealtimeMessageEvent;

function run(target: string | undefined, onEvent?: (e: RealtimeMessageEvent, t: string | undefined) => { queue: boolean }) {
    const calls: Array<[string, string]> = [];
    const origWarn = console.warn;
    const origLog = console.log;
    console.warn = () => {};
    console.log = () => {};
    try {
        handleRealtimeEvent({ event, target, ext: onEvent ? { onEvent } : {}, enqueue: (t, tag) => calls.push([t, tag]) });
    } finally {
        console.warn = origWarn;
        console.log = origLog;
    }
    return calls;
}

test("no hook and a known target: queued once as realtime-ws", () => {
    assert.deepEqual(run("Nhóm A"), [["Nhóm A", "realtime-ws"]]);
});

test("hook returning queue:false: nothing queued", () => {
    assert.deepEqual(run("Nhóm A", () => ({ queue: false })), []);
});

test("hook that throws: the target is still queued", () => {
    assert.deepEqual(run("Nhóm A", () => { throw new Error("hỏng"); }), [["Nhóm A", "realtime-ws"]]);
});

test("unknown target: nothing queued", () => {
    assert.deepEqual(run(undefined), []);
});

test("src/watch imports no business folder", () => {
    const dir = path.join(process.cwd(), "src", "watch");
    const re = /from\s+["']\.\.\/(chat|vision|lesson|master|leave|minutes|runner|total|reportSets)\//;
    const bad: string[] = [];
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
        fs.readFileSync(path.join(dir, f), "utf8").split(/\r?\n/).forEach((line, i) => {
            if (re.test(line)) bad.push(`${f}:${i + 1}`);
        });
    }
    assert.deepEqual(bad, []);
});
