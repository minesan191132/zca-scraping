import type { SourceMessage } from "../src/types/index.js";

export const DAY = "2026-09-24";
/** Epoch ms of hour:minute on 2026-09-24 in Vietnam (UTC+7). */
export const at = (hour: number, minute = 0): number => Date.UTC(2026, 8, 24, hour - 7, minute);
export const YESTERDAY = Date.UTC(2026, 8, 23, 1, 0);

const base = { groupId: "g1", groupName: "LC_SaoMai1_TĐ", senderId: "u1", msgType: "desktop.text" };

let seq = 0;
export function msg(content: string, ts: number, extra: Partial<SourceMessage> = {}): SourceMessage {
    seq += 1;
    return { ...base, msgId: `m${seq}`, ts, content, ...extra };
}

export const COMPLETE = [
    "BÁO CÁO ĐẦU BUỔI DẠY",
    "- Tên Giáo Viên: Nguyễn Văn A",
    "- Tên Trợ Giảng: Trần Thị B",
    "- Phòng Máy: PM1",
    "- Tổng số máy: 36",
    "- Tổng số máy bị lỗi: 0",
    "- Số máy còn thiếu cho HS: 0",
    "- Tình trạng Netsupport: T",
    "- Tình trạng Internet:T",
    "- Tình trạng Loa, Âm ly: B",
    "- Tình trạng máy lạnh, máy quạt: K",
].join("\n");

export const IT_MAINTENANCE = COMPLETE.replace("BÁO CÁO ĐẦU BUỔI DẠY", "BÁO CÁO CUỐI BUỔI DẠY").replace("Tổng số máy bị lỗi: 0", "Tổng số máy bị lỗi: IT bảo trì");

export const NO_INTERNET_LINE = COMPLETE.replace("- Tình trạng Internet:T\n", "");

export const COLLEGE_ROOM = COMPLETE.replace("Phòng Máy: PM1", "Phòng Máy: Học tại lớp");

export const FAULTY_WITH_NOTE = COMPLETE.replace("Tổng số máy bị lỗi: 0", "Tổng số máy bị lỗi: 3(máy 35 không lên; máy 41 hỏng màn hình)");

export const SPECIALIST = "BÁO CÁO CHUYÊN MÔN\n- Tên Giáo Viên: Nguyễn Văn A\n- Lớp: 9A";

/** Form báo cáo đầu/cuối buổi MỚI của trường (2026-10-21): tiêu đề không có "DẠY", không có dòng Tình trạng Internet. Tên người là tên giả. */
export const NEW_FORM_START = [
    "BÁO CÁO ĐẦU BUỔI",
    "- Cấp: LC",
    "- Tên Trường: Sao Mai 1",
    "- Phân hiệu:",
    "- Phường/Xã: TĐ",
    "- Tên Giáo viên: Nguyễn Văn A",
    "- Tên Trợ giảng: Trần Thị B",
    "- Phòng máy: PM1",
    "- Tổng số máy: 42",
    "- Số máy bị lỗi: 1(máy 32 lỗi Office)",
    "- Số máy còn thiếu: 0",
    "- Tình trạng Netsupport: T",
    "- Tình trạng Âm thanh: B",
    "- Tình trạng Máy lạnh: K",
].join("\n");

export const NEW_FORM_END = [
    "BÁO CÁO CUỐI BUỔI",
    "- Cấp: LC",
    "- Tên Trường: Sao Mai 1",
    "- Phân hiệu: Chưa có thông tin",
    "- Phường/Xã: TĐ",
    "- Tên Giáo viên: Nguyễn Văn A",
    "- Tên Trợ giảng: Trần Thị B, Lê Văn C",
    "- Phòng máy: H002",
    "- Tổng số máy: 40 + 1 GV",
    "- Số máy bị lỗi: 3 (máy 12, 16, 31 không lên nguồn)",
    "- Số máy còn thiếu: 0",
    "- Sĩ số học sinh: 3.1(20/18), 5SN(22/22)",
    "- Có tập ghi chép: 0",
    "- Tình trạng Netsupport: T",
    "- Tình trạng Âm thanh: T",
    "- Tình trạng Máy lạnh: T",
    "- Tốc độ internet: 220",
    "- Camera hỗ trợ: C",
    "- Tắt thiết bị điện: C",
    "- Ghế ngồi gọn gàng: N",
    "- Vệ sinh phòng máy: S",
    "- Tuân thủ nội quy: T",
    "- Danh sách vi phạm: K",
].join("\n");

/** Form cũ của IT "BÁO CÁO CUỐI BUỔI" (cùng tiêu đề với form mới của trường, nhưng không có dòng Tên Giáo viên). */
export const OLD_IT_END_OF_SHIFT = "BÁO CÁO CUỐI BUỔI\n- Tên trường: Sao Mai 1 - TĐ\n- Phòng máy: PM1\n- Vệ sinh phòng máy: S";
