import { MESSAGE_TITLES } from "../constants/reportTitles.js";
import { fold, foldTitle, splitLabel } from "./parseReport.js";
import { canonicalShiftEndLabel, TITLE_KEYS } from "./spelling.js";
import { todayVietnam } from "./time.js";

const LEGACY_END_TITLE = fold(MESSAGE_TITLES.legacyEndOfSession);

export interface CleaningRoomResult {
    tenTruong: string;
    khuVuc: string;
    phongMay: string;
    tenIT: string;
}

/** Tin "BÁO CÁO CUỐI BUỔI" (form cũ của IT): dòng đầu phải khớp CHÍNH XÁC, không có gì thêm sau (kể cả "DẠY"), để không lẫn
 * với báo cáo cuối buổi dạy của trường học (classifyTitle trong parseReport.ts yêu cầu "DẠY", nên tiêu đề này
 * không còn bị 2 bên cùng nhận nữa, nhưng vẫn giữ so khớp CHÍNH XÁC ở đây làm rào chắn thứ 2). Báo cáo VỆ SINH không còn dùng
 * hàm này (đã chuyển sang `classifyEndOfShiftTitle`); báo cáo THỜI GIAN CHƯA BẢO TRÌ và PHÚT vẫn đọc form cũ nên còn dùng. */
export function classifyCleaningTitle(content: string): boolean {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return fold(lines[0] ?? "") === LEGACY_END_TITLE;
}

export function splitSchoolKhuVuc(value: string): { tenTruong: string; khuVuc: string } {
    const idx = value.lastIndexOf(" - ");
    if (idx < 0) return { tenTruong: value.trim(), khuVuc: "" };
    return { tenTruong: value.slice(0, idx).trim(), khuVuc: value.slice(idx + 3).trim() };
}

/** Tin "CÔNG VIỆC CUỐI CA LÀM" (form IT mới): dòng đầu phải khớp CHÍNH XÁC, để không lẫn với "CÔNG VIỆC ĐẦU CA LÀM". */
export function classifyEndOfShiftTitle(content: string): boolean {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return TITLE_KEYS.shiftEnd.has(foldTitle(lines[0] ?? ""));
}

/** Các dòng của tin CÔNG VIỆC CUỐI CA LÀM mà bot đọc, giá trị giữ đúng như tin ghi (đã cắt khoảng trắng hai đầu). Dòng không có trong tin thì là chuỗi rỗng, riêng `tocDo` là null. */
export interface EndOfShift {
    /** Dòng "Cấp" ("I", "II", "III" hoặc chữ như "TH"). */
    cap: string;
    tenTruong: string;
    /** Dòng "Phân hiệu" ("CS1"...). */
    phanHieu: string;
    /** Dòng "Phường / Xã", đúng như tin ghi (`TĐ` vẫn là `TĐ`). */
    khuVuc: string;
    truongNhomIT: string;
    /** Dòng "Phòng máy làm việc" (có thể nhiều phòng, ngăn cách bằng dấu phẩy). */
    phongMay: string;
    /** Dòng "Tốc độ Internet" (chữ nguyên văn, "" khi để trống); null khi tin không có dòng này. */
    tocDo: string | null;
}

/**
 * Đọc tin CÔNG VIỆC CUỐI CA LÀM (form IT mới, sheet "MỚI (2)" của 01 - MAU BAO CAO KY THUAT.xlsx). KHÔNG kiểm tra tiêu đề: người gọi lọc bằng `classifyEndOfShiftTitle`.
 * Nhãn so không phân biệt hoa thường, dấu và khoảng trắng quanh dấu `/` ("Phường / Xã" = "Phường/Xã"). Tin thiếu "Tên Trường" thì trả null. Các dòng khác của tin (Tổng số máy,
 * Vệ sinh phòng máy, Hoàn thiện bảo trì, Ý kiến bổ sung...) bot không đọc. Dùng chung cho 4 báo cáo: vệ sinh, thời gian chưa bảo trì, trạng thái internet và biên bản.
 */
export function parseEndOfShift(content: string): EndOfShift | null {
    const r: EndOfShift = { cap: "", tenTruong: "", phanHieu: "", khuVuc: "", truongNhomIT: "", phongMay: "", tocDo: null };
    for (const line of content.normalize("NFC").split(/\r?\n/)) {
        const parsed = splitLabel(line);
        if (!parsed) continue;
        const label = canonicalShiftEndLabel(parsed.label);
        if (label === "cap") r.cap = parsed.value;
        else if (label === "ten truong") r.tenTruong = parsed.value;
        else if (label === "phan hieu") r.phanHieu = parsed.value;
        else if (label === "phuong xa") r.khuVuc = parsed.value;
        else if (label === "truong nhom it") r.truongNhomIT = parsed.value;
        else if (label === "phong may lam viec") r.phongMay = parsed.value;
        else if (label === "toc do internet") r.tocDo = parsed.value;
    }
    return r.tenTruong ? r : null;
}

/**
 * Một tin CÔNG VIỆC CUỐI CA LÀM báo MỘT phòng máy (dòng "Phòng máy làm việc"), nên trả về 0 hoặc 1 phần tử (mảng để
 * khớp với các nơi gọi). Lấy: "Tên Trường" (đúng như tin, không tách khu vực), "Phường / Xã" (đúng như tin ghi: ghi
 * `TĐ` thì lấy `TĐ`), "Phòng máy làm việc", "Trưởng nhóm IT". Tin thiếu "Tên Trường" thì bỏ; thiếu các dòng còn lại vẫn
 * ra dòng với ô trống. Dòng "Vệ sinh phòng máy: S/C" chỉ để người đọc, bot KHÔNG lấy (người dùng tự xếp loại ở cột GHI CHÚ).
 * Xem docs/bao-cao-nhu.md mục 6.
 */
export function parseCleaningMessage(content: string): CleaningRoomResult[] {
    const e = parseEndOfShift(content);
    return e ? [{ tenTruong: e.tenTruong, khuVuc: e.khuVuc, phongMay: e.phongMay, tenIT: e.truongNhomIT }] : [];
}

/**
 * Ngày dữ liệu vệ sinh nói về. TẠM THỜI (theo yêu cầu 2026-10-01): lấy CHÍNH NGÀY HÔM NAY — tin nhắn của ngày nào thì xuất
 * báo cáo của ngày đó, không lùi ngày. Quy tắc cũ theo hướng dẫn nghiệp vụ (báo cáo làm lùi 1 ngày so với ngày hiện tại,
 * riêng Thứ 2 lấy Thứ 7 vì Chủ nhật không có ghi nhận) đã bỏ khỏi code; muốn khôi phục thì sửa duy nhất hàm này
 * (hôm nay Thứ 2 -> addDays(today, -2), ngày khác -> addDays(today, -1)). KHÔNG dùng Phase/phaseDay.
 */
export function cleaningReportDay(now: number): string {
    return todayVietnam(now);
}
