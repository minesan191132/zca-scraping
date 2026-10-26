// Tiêu đề dùng chung của tin nguồn và của báo cáo. Chỉ chứa dữ liệu, KHÔNG import gì từ src/: các module lesson/ import file này,
// nếu nó import ngược lại (vd `fold` của parseReport.ts) sẽ thành vòng phụ thuộc (cùng lý do clockTime.ts không import config.ts).
// Tiêu đề của file Excel xuất KHÔNG ở đây: nó đọc từ ô A1 của mẫu lúc chạy (readTemplateTitle) để đổi mẫu là đổi tên.

/** Dòng đầu của tin IT, ghi đúng như người gửi viết. Nơi so khớp tự `fold` bằng đúng hàm nó đang dùng, không so chuỗi này trực tiếp. */
export const MESSAGE_TITLES = {
    attendanceStart: "ĐIỂM DANH ĐẦU BUỔI",
    attendanceEnd: "ĐIỂM DANH CUỐI BUỔI",
    shiftStart: "CÔNG VIỆC ĐẦU CA LÀM",
    shiftEnd: "CÔNG VIỆC CUỐI CA LÀM",
    electric: "LỖI ĐIỆN",
    /** Form cũ của IT, còn nằm trong kho từ các nhóm test. */
    legacyEndOfSession: "BÁO CÁO CUỐI BUỔI",
} as const;

/** Mô tả tin nguồn của báo cáo theo giai đoạn (đầu/cuối buổi dạy của trường); việc nhận diện thật nằm ở `classifyTitle` trong parseReport.ts. */
export const PHASE_SOURCE_TITLE = "BÁO CÁO ĐẦU/CUỐI BUỔI DẠY";

/** Nguồn của báo cáo biên bản: tin CÔNG VIỆC CUỐI CA LÀM kèm ảnh. */
export const MINUTES_SOURCE_TITLE = `${MESSAGE_TITLES.shiftEnd} + ẢNH BIÊN BẢN`;

/** Nguồn của báo cáo nghỉ phép: chỉ có ảnh. */
export const LEAVE_SOURCE_TITLE = "ẢNH NGHỈ PHÉP (không có tiêu đề)";

/** Tên hiển thị gọn của từng báo cáo, in ở `reports:list` và thông báo lỗi. Khóa là mã nội bộ trong `REPORT_KEYS`. */
export const REPORT_LABELS = {
    netsupport: "TÌNH TRẠNG NETSUPPORT",
    loa: "TÌNH TRẠNG ÂM THANH",
    internet: "TÌNH TRẠNG INTERNET",
    mayTinh: "TÌNH TRẠNG MÁY TÍNH",
    dien: "TÌNH TRẠNG ĐIỆN",
    cleaning: "VỆ SINH PHÒNG MÁY",
    attendance: "NỘI QUY THỰC TẬP",
    leave: "LỊCH NGHỈ PHÉP KỸ THUẬT",
    maintenance: "THỜI GIAN CHƯA BẢO TRÌ PM",
    internetSpeed: "TRẠNG THÁI KẾT NỐI INTERNET",
    minutes: "QUẢN LÝ BIÊN BẢN",
    attendanceStart: MESSAGE_TITLES.attendanceStart,
    attendanceEnd: MESSAGE_TITLES.attendanceEnd,
    shiftStart: MESSAGE_TITLES.shiftStart,
    shiftEnd: MESSAGE_TITLES.shiftEnd,
} as const;
