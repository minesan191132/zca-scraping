import "./helpers/pinConfig.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { indexMaster } from "../src/master/masterIndex.js";
import { ensureMaster, findMaster, findPreviousMaster, MASTER_DEFS, masterFileName } from "../src/master/masterStore.js";
import { updateMaster, type UpdateDeps } from "../src/master/updateMaster.js";
import type { PatchResult } from "../src/master/masterPatch.js";
import { writeMasterFixture } from "./helpers/masterFixtures.js";

function setup() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "upd-"));
    const templatesDir = path.join(root, "mau");
    fs.mkdirSync(templatesDir);
    writeMasterFixture(path.join(templatesDir, MASTER_DEFS.maintenance.template), { "TP HCM": [["TH A", "Q1", null, 46290, null]] }, { speed: false });
    const dir = path.join(root, "2610", "261009", "NguoiB");
    const reviewFile = path.join(root, "out", "master-review.maintenance.json");
    const patched: string[] = [];
    const deps: UpdateDeps = { index: indexMaster, patch: (file, cells) => { patched.push(`${path.basename(file)}:${cells.length}`); } };
    const backupDir = path.join(root, "sao-luu", "NguoiB");
    const base = { kind: "maintenance" as const, dir, templatesDir, backupDir, reviewFile, day: "2026-10-09", hhmm: "1105" };
    const cell = { sheet: "TP HCM", cell: "H4", value: 46304, note: "x" };
    return { root, dir, backupDir, deps, patched, base, reviewFile, cell };
}

test("lần đầu chép mẫu vào thư mục tổng, sao lưu rồi thay file tổng bằng bản đã vá", () => {
    const t = setup();
    const r = updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, t.deps);
    const master = path.join(t.dir, "THOI GIAN CHUA BAO TRI PM_261009_T6_1105.xlsx"); // 2026-10-09 là thứ Sáu = T6
    assert.equal(r.file, master);
    assert.equal(r.written, 1);
    assert.ok(fs.existsSync(master));
    assert.ok(r.backup && fs.existsSync(r.backup) && r.backup.startsWith(path.join(t.backupDir, "261009")));
    assert.equal(t.patched.length, 1);
    assert.deepEqual(fs.readdirSync(t.dir).filter((f) => f.startsWith(".tmp-")), []);
});

test("bản vá rỗng: không sao lưu, không gọi Excel, vẫn ghi danh sách cần xem", () => {
    const t = setup();
    const review = [{ school: "TH Z", khuVuc: "Q1", room: null, msgId: "m", reason: "khong_khop" as const }];
    const r = updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [], review }) }, t.deps);
    assert.equal(r.written, 0);
    assert.equal(r.backup, null);
    assert.deepEqual(t.patched, []);
    assert.deepEqual(JSON.parse(fs.readFileSync(t.reviewFile, "utf8")), review);
    assert.equal(fs.existsSync(t.backupDir), false);
});

test("--dry-run: không vá, không sao lưu, không ghi file cần xem", () => {
    const t = setup();
    const r = updateMaster({ ...t.base, dryRun: true, build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, t.deps);
    assert.equal(r.written, 0);
    assert.equal(r.cells.length, 1);
    assert.deepEqual(t.patched, []);
    assert.equal(fs.existsSync(t.reviewFile), false);
    assert.equal(fs.existsSync(t.backupDir), false);
});

test("lỗi khi vá: file tổng giữ nguyên, bản tạm bị xóa, lỗi được ném lại kèm gợi ý", () => {
    const t = setup();
    updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps); // tạo file tổng từ mẫu
    const master = findMaster("maintenance", t.dir)!;
    const before = fs.readFileSync(master);
    const bad: UpdateDeps = { ...t.deps, patch: () => { throw new Error("Excel lỗi"); } };
    assert.throws(() => updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, bad), /đang mở trong Excel\?[\s\S]*Excel lỗi/);
    assert.deepEqual(fs.readFileSync(master), before);
    assert.deepEqual(fs.readdirSync(t.dir).filter((f) => f.startsWith(".tmp-")), []);
});

test("không có file tổng và cũng không có mẫu: lỗi nói rõ đường dẫn", () => {
    const t = setup();
    fs.rmSync(path.join(t.root, "mau", MASTER_DEFS.maintenance.template));
    assert.throws(() => updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps), /file mẫu/);
});

test("rmSync bản tạm lỗi trong lúc dọn không được nuốt lỗi gốc", () => {
    const t = setup();
    updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps);
    const stuck: UpdateDeps = {
        ...t.deps,
        patch: (tmp) => {
            fs.rmSync(tmp, { force: true });
            fs.mkdirSync(tmp); // rmSync(tmp, { force: true }) sẽ ném ERR_FS_EISDIR trên thư mục
            throw new Error("Excel treo");
        },
    };
    assert.throws(() => updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, stuck), /đang mở trong Excel\?[\s\S]*Excel treo/);
});

test("bản tạm cũ còn sót từ lần chạy trước không chặn lần sau và bị quét", () => {
    const t = setup();
    updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps);
    const stale = path.join(t.dir, ".tmp-1-THOI GIAN CHUA BAO TRI PM.xlsx");
    fs.writeFileSync(stale, "cu");
    const r = updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, t.deps);
    assert.equal(r.written, 1);
    assert.equal(fs.existsSync(stale), false);
    assert.deepEqual(fs.readdirSync(t.dir).filter((f) => f.startsWith(".tmp-")), []);
});

test("file tổng đang bị khóa: không sao lưu, không vá, báo rõ", () => {
    const t = setup();
    updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps);
    const locked: UpdateDeps = { ...t.deps, canWrite: () => false };
    assert.throws(() => updateMaster({ ...t.base, build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, locked), /đang bị khóa \(đang mở trong Excel\?\)/);
    assert.equal(fs.existsSync(t.backupDir), false);
    assert.equal(t.patched.length, 0);
});

test("ngày mới chép tiếp từ file tổng ngày trước thay vì file mẫu", () => {
    const t = setup();
    const root = path.join(t.root, "trang-thai");
    const old = path.join(root, "2610", "261009", "NguoiB", MASTER_DEFS.maintenance.file);
    fs.mkdirSync(path.dirname(old), { recursive: true });
    fs.writeFileSync(old, "ban-ngay-truoc");
    assert.equal(findPreviousMaster("maintenance", root, "NguoiB", "2026-10-10"), old);
    assert.equal(findPreviousMaster("maintenance", root, "NguoiB", "2026-10-09"), null);
    const next = ensureMaster("maintenance", path.join(root, "2610", "261010", "NguoiB"), t.base.templatesDir, old);
    assert.equal(fs.readFileSync(next, "utf8"), "ban-ngay-truoc");
});

test("tên file tổng có ngày, thứ và giờ như các báo cáo khác (CN = T1, thứ Tư = T4); .xlsm giữ đuôi", () => {
    assert.equal(masterFileName("maintenance", "2026-10-21", "1030"), "THOI GIAN CHUA BAO TRI PM_261021_T4_1030.xlsx");
    assert.equal(masterFileName("internetSpeed", "2026-10-25", "0905"), "TRANG THAI KET NOI INTERNET_261025_T1_0905.xlsm");
});

test("ngày mới chép tiếp từ file tổng ngày trước dù file đó có TÊN CŨ (cố định) hay tên có giờ; không rơi về file mẫu", () => {
    const t = setup();
    const root = path.join(t.root, "trang-thai");
    const legacy = path.join(root, "2610", "261009", "NguoiB", MASTER_DEFS.maintenance.file);
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    fs.writeFileSync(legacy, "du-lieu-cu");
    assert.equal(findPreviousMaster("maintenance", root, "NguoiB", "2026-10-10"), legacy);
    const timed = path.join(root, "2610", "261010", "NguoiB", masterFileName("maintenance", "2026-10-10", "1000"));
    fs.mkdirSync(path.dirname(timed), { recursive: true });
    fs.writeFileSync(timed, "du-lieu-co-gio");
    assert.equal(findPreviousMaster("maintenance", root, "NguoiB", "2026-10-11"), timed);
    const next = updateMaster({ ...t.base, dir: path.join(root, "2610", "261011", "NguoiB"), day: "2026-10-11", hhmm: "0800", previous: timed, build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps);
    assert.equal(fs.readFileSync(next.file, "utf8"), "du-lieu-co-gio");
    assert.equal(path.basename(next.file), masterFileName("maintenance", "2026-10-11", "0800"));
});

test("ghi ô: file tổng đổi sang giờ mới và bản cũ (cả tên cố định cũ) bị xóa sau khi bản mới vào chỗ", () => {
    const t = setup();
    updateMaster({ ...t.base, hhmm: "0800", build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps);
    const first = findMaster("maintenance", t.dir)!;
    assert.equal(path.basename(first), masterFileName("maintenance", "2026-10-09", "0800"));
    const r = updateMaster({ ...t.base, hhmm: "0915", build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, t.deps);
    assert.equal(path.basename(r.file), masterFileName("maintenance", "2026-10-09", "0915"));
    assert.equal(fs.existsSync(first), false);
    assert.deepEqual(fs.readdirSync(t.dir), [path.basename(r.file)]);
    // thư mục còn tên cố định cũ: được nhận, thay bằng tên có giờ
    fs.rmSync(r.file);
    fs.writeFileSync(path.join(t.dir, MASTER_DEFS.maintenance.file), "ban-cu");
    const r2 = updateMaster({ ...t.base, hhmm: "1000", build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, t.deps);
    assert.deepEqual(fs.readdirSync(t.dir), [path.basename(r2.file)]);
});

test("bản vá rỗng: tên file tổng giữ nguyên giờ cũ", () => {
    const t = setup();
    updateMaster({ ...t.base, hhmm: "0800", build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps);
    const r = updateMaster({ ...t.base, hhmm: "1200", build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps);
    assert.equal(path.basename(r.file), masterFileName("maintenance", "2026-10-09", "0800"));
});

test("nhiều file tổng trong thư mục: lấy bản mới nhất theo giờ, bản tạm và khóa Excel không bị nhận", () => {
    const t = setup();
    fs.mkdirSync(t.dir, { recursive: true });
    for (const name of [masterFileName("maintenance", "2026-10-09", "0900"), masterFileName("maintenance", "2026-10-09", "1130"), MASTER_DEFS.maintenance.file, ".tmp-1-" + masterFileName("maintenance", "2026-10-09", "2359"), "~$" + masterFileName("maintenance", "2026-10-09", "2358")]) fs.writeFileSync(path.join(t.dir, name), "x");
    assert.equal(path.basename(findMaster("maintenance", t.dir)!), masterFileName("maintenance", "2026-10-09", "1130"));
    assert.equal(findMaster("maintenance", path.join(t.root, "khong-co")), null);
    const r = updateMaster({ ...t.base, hhmm: "1200", build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, t.deps);
    assert.equal(path.basename(r.file), masterFileName("maintenance", "2026-10-09", "1200"));
});

test("sao lưu giữ tên gốc: không chứa phần _T<thứ>_<giờ> của file tổng", () => {
    const t = setup();
    updateMaster({ ...t.base, hhmm: "0800", build: (): PatchResult => ({ cells: [], review: [] }) }, t.deps);
    const r = updateMaster({ ...t.base, hhmm: "0915", build: (): PatchResult => ({ cells: [t.cell], review: [] }) }, t.deps);
    assert.equal(path.basename(r.backup!), "THOI GIAN CHUA BAO TRI PM_0915.xlsx");
});
