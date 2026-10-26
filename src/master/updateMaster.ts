import fs from "node:fs";
import path from "node:path";
import type { MasterColumns, MasterRow } from "./masterIndex.js";
import type { PatchCell, PatchResult, ReviewItem } from "./masterPatch.js";
import { backupMaster, ensureMaster, MASTER_DEFS, masterBaseName, masterFileName, type MasterKind } from "./masterStore.js";

export interface UpdateDeps {
    index(file: string, cols: MasterColumns): MasterRow[];
    /** Áp bản vá lên `file` (một bản TẠM, không phải file tổng). */
    patch(file: string, cells: PatchCell[]): void;
    /** File tổng có ghi được không (Excel đang mở thì không). Mặc định: thử mở để ghi. */
    canWrite?(file: string): boolean;
}

export interface UpdateResult {
    file: string;
    written: number;
    review: ReviewItem[];
    backup: string | null;
    cells: PatchCell[];
    /** Việc phụ không thành công nhưng không ảnh hưởng dữ liệu (không xóa được bản cũ sau khi đổi tên). */
    warning?: string;
}

export interface UpdateOptions {
    kind: MasterKind;
    dir: string;
    templatesDir: string;
    /** Thư mục sao lưu (`masterBackupDirFor`): bản cũ của file tổng được chép vào đây trước mỗi lần ghi. */
    backupDir: string;
    /** File tổng mới nhất của ngày trước (để chép sang thư mục ngày mới); null = chép từ file mẫu. */
    previous?: string | null;
    reviewFile: string;
    day: string;
    hhmm: string;
    dryRun?: boolean;
    build(rows: MasterRow[]): PatchResult;
}

function defaultCanWrite(file: string): boolean {
    try {
        fs.closeSync(fs.openSync(file, "r+"));
        return true;
    } catch {
        return false;
    }
}

/** Bản tạm của lần chạy trước (tiến trình chết giữa chừng, Excel treo) không còn dùng: xóa được thì xóa, không được thì bỏ qua. */
function sweepTemps(dir: string): void {
    for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(".tmp-")) {
            try {
                fs.rmSync(path.join(dir, f), { recursive: true, force: true });
            } catch {
                /* đang bị giữ: để lần sau */
            }
        }
    }
}

let tmpCounter = 0;

/**
 * Cập nhật MỘT file tổng: lập chỉ mục, tạo bản vá, và nếu có ô cần ghi thì kiểm tra file ghi được, sao lưu, vá một BẢN TẠM rồi đổi tên thay file tổng (file tổng không bao giờ bị ghi dở).
 * Bản vá rỗng thì không sao lưu và không mở Excel. `dryRun` chỉ trả bản vá, không ghi gì (kể cả danh sách cần xem). File đang mở trong Excel thì ném lỗi TRƯỚC khi sao lưu hay vá; lỗi khi vá
 * hoặc đổi tên giữ nguyên file tổng, và lỗi dọn bản tạm không che lỗi gốc.
 */
export function updateMaster(opts: UpdateOptions, deps: UpdateDeps): UpdateResult {
    const newName = masterFileName(opts.kind, opts.day, opts.hhmm);
    const file = ensureMaster(opts.kind, opts.dir, opts.templatesDir, opts.previous ?? null, newName);
    const { cells, review } = opts.build(deps.index(file, MASTER_DEFS[opts.kind].cols));
    if (opts.dryRun) return { file, written: 0, review, backup: null, cells };
    fs.mkdirSync(path.dirname(opts.reviewFile), { recursive: true });
    fs.writeFileSync(opts.reviewFile, JSON.stringify(review, null, 2), "utf8");
    if (cells.length === 0) return { file, written: 0, review, backup: null, cells };

    if (!(deps.canWrite ?? defaultCanWrite)(file)) {
        throw new Error(`file tổng ${path.basename(file)} đang bị khóa (đang mở trong Excel?), chưa ghi gì và chưa sao lưu; sẽ thử lại vòng sau`);
    }
    sweepTemps(opts.dir);
    const backup = backupMaster(file, opts.backupDir, opts.day, opts.hhmm, masterBaseName(opts.kind));
    // Có ô để ghi thì file tổng lấy giờ mới trong tên (như ĐIỆN: chỉ đổi giờ khi dòng thay đổi); bản cũ chỉ bị xóa SAU khi bản mới đã vào chỗ.
    const target = path.join(opts.dir, newName);
    const tmp = path.join(opts.dir, `.tmp-${process.pid}-${Date.now()}-${tmpCounter++}-${path.basename(target)}`);
    try {
        fs.copyFileSync(file, tmp);
        deps.patch(tmp, cells);
        fs.renameSync(tmp, target);
    } catch (err) {
        try {
            fs.rmSync(tmp, { recursive: true, force: true });
        } catch {
            /* bản tạm bị giữ (Excel treo): sweepTemps lần sau sẽ dọn */
        }
        throw new Error(`không ghi được file tổng ${path.basename(file)} (file đang mở trong Excel? bản sao lưu: ${backup}): ${(err as Error).message}`);
    }
    let warning: string | undefined;
    if (path.resolve(target) !== path.resolve(file)) {
        try {
            fs.rmSync(file, { force: true });
        } catch (err) {
            // bản cũ bị giữ: không hỏng dữ liệu (lần sau `findMaster` lấy bản có giờ mới nhất), chỉ báo để người dùng biết còn thừa file
            warning = `không xóa được bản cũ ${path.basename(file)}: ${(err as Error).message}`;
        }
    }
    return { file: target, written: cells.length, review, backup, cells, ...(warning ? { warning } : {}) };
}
