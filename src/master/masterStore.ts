import fs from "node:fs";
import path from "node:path";
import { setReportDir } from "../core/paths.js";
import { freeFormFileName } from "../lesson/statusReportLayout.js";
import type { MasterColumns } from "./masterIndex.js";

export type MasterKind = "maintenance" | "internetSpeed";

/** Hai file tổng: tên mẫu trong `data/mau bao cao new`, tên file tổng trong thư mục của bộ trong ngày, và chữ tiêu đề các cột cần ghi. */
export const MASTER_DEFS: Record<MasterKind, { template: string; file: string; cols: MasterColumns }> = {
    maintenance: { template: "07- THOI GIAN CHUA BAO TRI PM.xlsx", file: "THOI GIAN CHUA BAO TRI PM.xlsx", cols: { date: "BẢO TRÌ GN" } },
    internetSpeed: { template: "08 - TRANG THAI KET NOI INTERNET.xlsm", file: "TRANG THAI KET NOI INTERNET.xlsm", cols: { date: "NGÀY CẬP NHẬT", speed: "TỐC ĐỘ" } },
};

/** Số ngày lùi tối đa khi tìm file tổng của ngày trước để chép sang ngày mới. */
const CARRY_BACK_DAYS = 400;

/** `<statusExportDir>/<yyMM>/<yyMMdd>/<id bộ>`: file tổng nằm cùng thư mục với các báo cáo khác của bộ trong ngày. */
export const masterDirFor = (root: string, setId: string, day: string): string => setReportDir(root, setId, day);

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tên gốc (không đuôi) của file tổng, vd "THOI GIAN CHUA BAO TRI PM": dùng cho tên có giờ và cho tên bản sao lưu. */
export const masterBaseName = (kind: MasterKind): string => path.basename(MASTER_DEFS[kind].file, path.extname(MASTER_DEFS[kind].file));

/**
 * Tên file tổng như các báo cáo khác: `<tên gốc>_<yyMMdd>_T<thứ>_<HHmm><đuôi>`. `day` là ngày của thư mục, `hhmm` là giờ lần cập nhật (hoặc giờ tạo file).
 * Dùng chung `freeFormFileName` với các báo cáo trạng thái để cách tính thứ (CN = T1) giống hệt.
 */
export function masterFileName(kind: MasterKind, day: string, hhmm: string): string {
    return freeFormFileName(masterBaseName(kind), day, hhmm).replace(/\.xlsx$/, path.extname(MASTER_DEFS[kind].file));
}

/**
 * File tổng hiện hành trong `dir`, hoặc null. Nhận tên có giờ (`<tên gốc>_<yyMMdd>_T<thứ>_<HHmm><đuôi>`) và tên cố định cũ (`MASTER_DEFS[kind].file`) để
 * thư mục các ngày trước và máy chưa đổi vẫn dùng được. Regex neo ở đầu nên không nhận bản tạm `.tmp-…` hay khóa `~$…` của Excel. Có nhiều file (ví dụ chết
 * giữa lúc đổi tên và xóa bản cũ) thì lấy bản MỚI NHẤT theo HHmm trong tên; tên cố định cũ xếp thấp nhất.
 */
export function findMaster(kind: MasterKind, dir: string): string | null {
    let names: string[];
    try {
        names = fs.readdirSync(dir);
    } catch {
        return null;
    }
    const def = MASTER_DEFS[kind];
    const re = new RegExp(`^${escapeRe(masterBaseName(kind))}_(\\d{6})_T\\d_(\\d{4})${escapeRe(path.extname(def.file))}$`);
    let best: { name: string; rank: string } | null = null;
    for (const name of names) {
        const m = re.exec(name);
        const rank = m ? `1${m[1]}${m[2]}` : name === def.file ? "0" : null;
        if (rank !== null && (best === null || rank > best.rank)) best = { name, rank };
    }
    return best ? path.join(dir, best.name) : null;
}

/** File tổng MỚI NHẤT của các ngày trước `day` (lùi tối đa `CARRY_BACK_DAYS` ngày, hơn một năm), hoặc null: ngày mới chép tiếp từ đây để dữ liệu không mất. */
export function findPreviousMaster(kind: MasterKind, root: string, setId: string, day: string): string | null {
    const [y, m, d] = day.split("-").map(Number);
    for (let i = 1; i <= CARRY_BACK_DAYS; i++) {
        const t = new Date(Date.UTC(y, m - 1, d - i));
        const iso = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
        const file = findMaster(kind, masterDirFor(root, setId, iso));
        if (file) return file;
    }
    return null;
}

/**
 * Trả đường dẫn file tổng của thư mục `dir`; chưa có thì chép từ `previous` (file tổng ngày trước), rồi mới đến file mẫu, vào tên `newName` (mặc định là tên cố định cũ;
 * `updateMaster` truyền tên có giờ). Ném lỗi rõ ràng khi không có nguồn nào.
 */
export function ensureMaster(kind: MasterKind, dir: string, templatesDir: string, previous: string | null = null, newName: string = MASTER_DEFS[kind].file): string {
    const def = MASTER_DEFS[kind];
    const existing = findMaster(kind, dir);
    if (existing) return existing;
    const file = path.join(dir, newName);
    const template = path.join(templatesDir, def.template);
    const source = previous && fs.existsSync(previous) ? previous : template;
    if (!fs.existsSync(source)) throw new Error(`không có file tổng "${file}" và cũng không có file mẫu "${template}" để tạo nó.`);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(source, file);
    return file;
}

/** `<dataDir>/sao-luu/<id bộ>`: thư mục sao lưu file tổng, nằm trong data của dự án, không nằm trong thư mục báo cáo ngày. */
export const masterBackupDirFor = (dataDir: string, setId: string): string => path.join(dataDir, "sao-luu", setId);

/** Chép bản hiện tại vào `<backupDir>/<yyMMdd>/<tên>_<HHmm><đuôi>` và trả đường dẫn bản sao lưu. `baseName` (mặc định tên file) để bản sao lưu không mang cả giờ trong tên file tổng. */
export function backupMaster(file: string, backupDir: string, day: string, hhmm: string, baseName?: string): string {
    const yyMMdd = day.slice(2, 4) + day.slice(5, 7) + day.slice(8, 10);
    const ext = path.extname(file);
    const target = path.join(backupDir, yyMMdd, `${baseName ?? path.basename(file, ext)}_${hhmm}${ext}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
    return target;
}
