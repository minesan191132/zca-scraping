import XLSX from "xlsx";
import { norm, roomKey } from "./masterKeys.js";

export interface MasterColumns {
    /** Chữ tiêu đề (hàng 3) của cột ngày: "BẢO TRÌ GN" hoặc "NGÀY CẬP NHẬT". */
    date: string;
    /** Chữ tiêu đề của cột tốc độ ("TỐC ĐỘ"); chỉ tệp trạng thái internet có. */
    speed?: string;
}

export interface MasterRow {
    sheet: string;
    row: number;
    schoolKey: string;
    khuVuc: string;
    /** Số phòng đã chuẩn hóa ("1", "p36"); rỗng ở tệp không có cột PM. */
    room: string;
    dateRef: string;
    speedRef: string | null;
    date: number | null;
    speed: number | null;
}

const HEADER_ROW = 3;
const FIRST_DATA_ROW = 4;
/** Chỉ đọc khối bảng chính A:L; các khối phụ bên phải (M trở đi) là bảng tra cứu, không phải dữ liệu. */
const LAST_COLUMN = 11;
const SKIP_SHEETS = new Set(["FORM", "THONG KE"]);

const numberOf = (c: XLSX.CellObject | undefined): number | null => (c && c.t === "n" && typeof c.v === "number" ? c.v : null);

/** Đọc file tổng (CHỈ ĐỌC) thành danh sách dòng có tên trường, từ mọi sheet vùng. Vị trí cột lấy theo tiêu đề hàng 3 của TỪNG sheet. */
export function indexMaster(file: string, cols: MasterColumns): MasterRow[] {
    const wb = XLSX.readFile(file);
    const out: MasterRow[] = [];
    for (const sheet of wb.SheetNames) {
        if (SKIP_SHEETS.has(sheet.toUpperCase())) continue;
        const ws = wb.Sheets[sheet];
        if (!ws["!ref"]) continue;
        const byHeader = new Map<string, string>();
        for (let c = 0; c <= LAST_COLUMN; c++) {
            const h = ws[`${XLSX.utils.encode_col(c)}${HEADER_ROW}`];
            if (h) byHeader.set(norm(h.v), XLSX.utils.encode_col(c));
        }
        const colSchool = byHeader.get("ten truong");
        const colKv = byHeader.get("khu vuc");
        const colPm = byHeader.get("pm");
        const colDate = byHeader.get(norm(cols.date));
        const colSpeed = cols.speed ? byHeader.get(norm(cols.speed)) : undefined;
        if (!colSchool || !colDate) continue;
        const last = XLSX.utils.decode_range(ws["!ref"]).e.r + 1;
        for (let r = FIRST_DATA_ROW; r <= last; r++) {
            const name = ws[`${colSchool}${r}`];
            if (!name || !String(name.v).trim()) continue;
            out.push({
                sheet,
                row: r,
                schoolKey: norm(name.v),
                khuVuc: colKv ? norm(ws[`${colKv}${r}`]?.v) : "",
                room: colPm ? roomKey(ws[`${colPm}${r}`]?.v) : "",
                dateRef: `${colDate}${r}`,
                speedRef: colSpeed ? `${colSpeed}${r}` : null,
                date: numberOf(ws[`${colDate}${r}`]),
                speed: colSpeed ? numberOf(ws[`${colSpeed}${r}`]) : null,
            });
        }
    }
    return out;
}
