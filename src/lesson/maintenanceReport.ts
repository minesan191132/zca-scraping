import { classifyEndOfShiftTitle, parseEndOfShift, splitSchoolKhuVuc } from "./cleaningReport.js";
import { fold } from "./parseReport.js";
import { parseGroupName } from "./schoolArea.js";
import type { SourceMessage } from "../types/index.js";

/** Một trường có báo cáo trong ngày (một dòng của file THỜI GIAN CHƯA BẢO TRÌ). */
export interface MaintenanceEntry {
    maNhom: string;
    maTinNhan: string;
    thoiGian: number;
    /** Cấp học tách từ tên trường ("THCS", "TH", "THPT"...), hoặc lấy từ dòng "Cấp" (I, II, III đổi lại thành TH, THCS, THPT); rỗng khi không biết. */
    cap: string;
    /** Tên riêng của trường, viết hoa, không kèm cấp, cơ sở và khu vực (như các báo cáo trạng thái khác). */
    tenTruong: string;
    khuVuc: string;
    /** Cơ sở ("CS1") lấy từ dòng "Phân hiệu" hoặc từ đuôi tên trường; rỗng khi trường không có cơ sở. */
    coSo: string;
}

const CAP_LA_MA: Record<string, string> = { I: "TH", II: "THCS", III: "THPT" };

/** Dòng "Cấp" của form: số La Mã (I, II, III) hoặc chữ (TH, THCS, THPT, LC, MN...). Rỗng khi không có. */
export function capFromLine(value: string): string {
    const v = value.trim().toUpperCase();
    return CAP_LA_MA[v] ?? v;
}

/** Dòng "Phân hiệu": "CS1", "cs 1", "Cơ sở 1" hay chỉ "1" đều ra "CS1"; chữ khác giữ nguyên (viết hoa). Rỗng khi để trống. */
export function coSoFromLine(value: string): string {
    const v = value.trim();
    if (!v) return "";
    const n = /(\d+)\s*$/.exec(v);
    return n && /^(cs|cơ sở|co so)?\s*\d+$/i.test(v) ? `CS${n[1]}` : v.toUpperCase();
}

/**
 * Nguồn của file THỜI GIAN CHƯA BẢO TRÌ là tin "CÔNG VIỆC CUỐI CA LÀM" (cùng nguồn với VỆ SINH, INTERNET và BIÊN BẢN). Lấy "Tên Trường", "Phường / Xã" (đúng như tin ghi),
 * "Phân hiệu" và "Cấp". Tên trường tách cấp theo tiền tố ("TH LƯƠNG THẾ VINH" thành TH và LƯƠNG THẾ VINH); tên không có tiền tố thì lấy cấp từ dòng "Cấp". Tin thiếu "Tên Trường" thì trả null.
 */
export function parseMaintenanceMessage(content: string): { cap: string; tenTruong: string; khuVuc: string; coSo: string } | null {
    if (!classifyEndOfShiftTitle(content)) return null;
    const e = parseEndOfShift(content);
    if (!e) return null;
    // "Phường / Xã" là nguồn khu vực; chỉ khi để trống mới lấy hậu tố " - Q6" của tên (cách viết cũ). Hậu tố chỉ tính là khu vực khi ngắn và không phải một cấp
    // ("THCS - THPT Nguyễn Khuyến" là tên liên cấp, không phải trường "THCS" ở khu vực "THPT Nguyễn Khuyến").
    const split = splitSchoolKhuVuc(e.tenTruong);
    const suffixIsArea = split.khuVuc !== "" && split.khuVuc.length <= 12 && !/^(MN|TH|THCS|THPT|LC\d?|CĐ|ĐH)(?![\p{L}\d])/iu.test(split.khuVuc);
    const name = suffixIsArea ? split : { tenTruong: e.tenTruong.trim(), khuVuc: "" };
    const truong = parseGroupName(name.tenTruong).truong;
    const khuVuc = (e.khuVuc || name.khuVuc).trim().toUpperCase();
    return {
        cap: truong?.capHoc ?? capFromLine(e.cap),
        tenTruong: truong?.tenRieng || name.tenTruong.toUpperCase(),
        khuVuc,
        coSo: coSoFromLine(e.phanHieu) || truong?.coSo || "",
    };
}

/**
 * Mỗi TRƯỜNG (và cơ sở) một dòng (ngày báo cáo của trường là ngày hôm nay, các cột PM chưa có nguồn): các tin "CÔNG VIỆC CUỐI CA LÀM" thỏa `include(ts)` được gom theo (tên trường, cơ sở,
 * khu vực); một trường báo nhiều lần hay nhiều phòng chỉ ra một dòng, giữ tin SỚM NHẤT. Thứ tự là thứ tự tin gửi.
 */
export function maintenanceEntries(messages: SourceMessage[], include: (ts: number) => boolean): MaintenanceEntry[] {
    const byKey = new Map<string, MaintenanceEntry>();
    for (const m of [...messages].sort((a, b) => a.ts - b.ts)) {
        if (!include(m.ts)) continue;
        const parsed = parseMaintenanceMessage(m.content);
        if (!parsed) continue;
        const key = `${fold(parsed.tenTruong)}|${fold(parsed.coSo)}|${fold(parsed.khuVuc)}`;
        if (!byKey.has(key)) byKey.set(key, { maNhom: m.groupId, maTinNhan: m.msgId, thoiGian: m.ts, ...parsed });
    }
    return [...byKey.values()];
}
