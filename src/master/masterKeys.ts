import { fold } from "../lesson/parseReport.js";
import { areaCode } from "../lesson/schoolArea.js";

/** Chuẩn hóa để so khớp: bỏ dấu, hạ chữ hoa, gộp khoảng trắng, cắt hai đầu. */
export const norm = (s: unknown): string => fold(String(s ?? "").trim()).replace(/\s+/g, " ");

/** Khu vực qua bảng mã: "THỦ ĐỨC", "Thủ Đức" và "TĐ" cùng ra "td"; chữ không có trong bảng giữ nguyên dạng `norm` (vẫn so như trước). */
export const areaKey = (s: unknown): string => {
    const text = String(s ?? "").trim();
    const code = areaCode(text);
    return code ? norm(code) : norm(text);
};

/** "PM1", "pm 1", 1 đều là "1"; "P36" là "p36" (phòng chữ so nguyên văn). */
export const roomKey = (s: unknown): string => norm(s).replace(/^pm\s*/, "").replace(/[^a-z0-9]/g, "");

/** Khóa trường: cấp + tên riêng ("THCS", "VĨNH LỘC B") hoặc nguyên tên trong file tổng ("THCS Vĩnh Lộc B") đều ra cùng một khóa. */
export const schoolKey = (cap: string, tenTruong: string): string => norm(`${cap} ${tenTruong}`);

/**
 * Các khóa có thể ứng với CÙNG một trường trong file tổng, theo thứ tự thử (cụ thể trước). File tổng ghi tên không đều nên một khóa không đủ:
 * - `<cấp> <tên> <CSn>`: file ghi cơ sở ngay trong tên ("TH Bình Trị 2 CS1") còn form IT để cơ sở ở dòng Phân hiệu;
 * - `<cấp> <tên>`: trường hợp thường;
 * - `<cấp> <tên> - <khu vực>`: file ghi hậu tố khu vực trong tên ("TH Kim Đồng - Q6");
 * - `<tên>`: dòng không có tiền tố cấp ("Đồng Xanh", cột CẤP là LC).
 * Người gọi dùng `findSchoolRow`, nó chỉ chấp nhận khóa sau khi các khóa trước không tìm thấy gì.
 */
export function schoolKeys(cap: string, tenTruong: string, coSo: string, khuVuc: string): string[] {
    // File tổng ghi hậu tố khu vực bằng mã ("TH Lương Thế Vinh - TĐ") còn tin hay ghi tên đầy đủ ("THỦ ĐỨC"): thử cả dạng mã, ngay sau dạng nguyên văn.
    const code = khuVuc ? areaCode(khuVuc) : null;
    const keys = [
        coSo ? schoolKey(cap, `${tenTruong} ${coSo}`) : "",
        schoolKey(cap, tenTruong),
        khuVuc ? schoolKey(cap, `${tenTruong} - ${khuVuc}`) : "",
        code ? schoolKey(cap, `${tenTruong} - ${code}`) : "",
        norm(tenTruong),
    ];
    return [...new Set(keys.filter((k) => k !== ""))];
}
