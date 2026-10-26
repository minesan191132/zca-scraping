/** Chữ OCR thật (rút gọn) của các ảnh mẫu; lỗi nhận dạng giữ nguyên vì bộ phân loại phải chịu được chúng. */
export const SAMPLE = {
    /** Bảng nghỉ phép xuất từ Excel (1280x517): OCR chỉ đọc ra tiêu đề công ty, phần còn lại là ký tự rác của khung bảng. */
    leaveTable: [
        "Py TIN HỌC ĐẠI DƯƠNG",
        "TY [ -  [I m T ,. U Tr",
        "m] mm  |sww| se | me | xw | so | me | xe | mm Ce rr mem",
        "(femme | 3 [oo | + [oven ow | o Jodo |» [ 4 | |",
        "IE CET I | me | 3 ET CA ET I VS II",
        "IE TS | + NE NCA CC CS I | | 1|",
        "IE NO BC",
        "IE CE NO T-|",
        "[ 5 [oe | o | œ |",
        "HC NGHI ew]",
    ].join("\n"),
    /** Bảng nghỉ phép ở mẫu cũ: OCR đọc được tên biểu mẫu và các nhãn. */
    leaveOld: [
        "4À TIN HỌC ĐẠI DUONG",
        "Em KỸ THUẬT NGHĨ PHÉP ĐÃ DUYỆT",
        "[Nhân viên báo cáo: Phan Thị Lan |Bộ phận: Nhân sự Ngày báo cáo: 02/10/2026",
        "CHÚ GIẢI & THONG KE",
    ].join("\n"),
    /** Ảnh Fast.com chụp màn hình. */
    speed: ["A i of", "3 Your Internet speed is ,", "& Mbps EF", "li al"].join("\n"),
    /** Biên bản bàn giao phòng máy (ảnh đứng 763x1280). */
    bienbanA: [
        "TY TNHH we —",
        "N Bs bì CÔNG TY TNHH TU VĂN & ĐÀO TẠO ĐẠT DỊ ONG",
        "| TIN HQC DAI DUONG",
        "2 BIEN BAN BAN GIAO PHONG MAY CHO TRUONG",
        "Hôm nay, nghy. 5... 40.2026 , tại Trường: .Z//@..S..ÿg Vn, By... Hm",
        "Dai diện công ty Np ug. Chương Vian: Bộ phi... fey Thr",
        "a Đại diện nhà trường. C - K24, foi Bộ phận: fae",
        "NHE Tên phòng máy: pan 4. (Cy)",
    ].join("\n"),
    /** Biên bản bàn giao linh kiện: OCR làm vỡ chữ "BIÊN BẢN BÀN GIAO" nhưng còn tiêu đề công ty và "XÁC NHẬN NHÀ TRƯỜNG". */
    bienbanB: ["2 a=", ": BIÊN BA TIN HỌC ĐẠI DƯƠNG", "Hon NBA GIÁO LINH KIEN CHO TRƯỜNG", "XÁC NHẬN NHÀ TRƯỜNG TIN _ DƯƠNG"].join("\n"),
    /** Ảnh danh sách máy của NetSupport: không liên quan. */
    netsupport: ["PC-01 Admin NSS V15.12.4 Windows 10 x64", "PC-02 Admin NSS V15.12.4 Windows 10 x64", "Client Version Client Platform"].join("\n"),
    /** Chỉ có tiêu đề công ty, không đủ để biết loại gì. */
    headingOnly: "TIN HỌC ĐẠI DƯƠNG",
};
