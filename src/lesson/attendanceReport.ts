import { foldTitle, splitLabel } from "./parseReport.js";
import { canonicalAttendanceLabel, isNoneValue, TITLE_KEYS } from "./spelling.js";

export interface AttendanceRoomResult {
    tenNV: string;
    noiLamViec: string;
}

/** Tin "ĐIỂM DANH ĐẦU BUỔI" (form IT mới): dòng đầu phải khớp CHÍNH XÁC, để không lẫn với "ĐIỂM DANH CUỐI BUỔI" (chưa đọc). */
export function classifyAttendanceTitle(content: string): boolean {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return TITLE_KEYS.attendanceStart.has(foldTitle(lines[0] ?? ""));
}

/**
 * Giờ để tính trễ và giờ hiển thị ở cột SÁNG/CHIỀU lấy từ giờ Zalo GHI NHẬN tin gửi tới (msg.ts), KHÔNG đọc giờ trong
 * nội dung — form mới không có dòng giờ nào. Mỗi tên trong dòng "Thực tập IT" (ngăn cách bằng dấu phẩy hoặc chấm phẩy)
 * là một người, cùng "Tên Trường" làm vị trí. "Tên IT, CTV" và "Nhân viên vắng" chưa vào file. Tin thiếu "Tên Trường"
 * hoặc không có thực tập (trống, `0`, "Không") không ra ai. Xem docs/bao-cao-nhu.md mục 7.
 */
export function parseAttendanceMessage(content: string): AttendanceRoomResult[] {
    let noiLamViec = "";
    let interns = "";
    for (const line of content.normalize("NFC").split(/\r?\n/)) {
        const parsed = splitLabel(line);
        if (!parsed) continue;
        const label = canonicalAttendanceLabel(parsed.label);
        if (label === "ten truong") noiLamViec = parsed.value;
        else if (label === "thuc tap it") interns = parsed.value;
    }
    if (!noiLamViec) return [];
    return interns
        .split(/[,;]/)
        .map((n) => n.trim())
        .filter((n) => n !== "" && !isNoneValue(n))
        .map((tenNV) => ({ tenNV, noiLamViec }));
}

export type AttendanceSession = "morning" | "afternoon";

export function attendanceSessionOf(hour: number): AttendanceSession {
    return hour < 12 ? "morning" : "afternoon";
}

/** Mốc tính trễ: QUA 8h05 (sáng) hoặc QUA 14h05 (chiều); đúng 8h05/14h05 chưa tính trễ (người dùng đổi từ 8h00/14h00 lên thêm 5 phút
 * ngày 2026-10-03). Giờ là giờ Zalo GHI NHẬN tin gửi tới, xem comment của `parseAttendanceMessage`. */
const LATE_AFTER: Record<AttendanceSession, { hour: number; minute: number }> = { morning: { hour: 8, minute: 5 }, afternoon: { hour: 14, minute: 5 } };

/** Tin điểm danh gửi quá 17h30 không còn được ghi nhận (đúng 17h30 vẫn ghi nhận). Buổi sáng tính tới trước 12h (xem `attendanceSessionOf`). */
const RECORD_UNTIL = { hour: 17, minute: 30 };

export function isRecordedAttendance(hour: number, minute: number): boolean {
    return hour < RECORD_UNTIL.hour || (hour === RECORD_UNTIL.hour && minute <= RECORD_UNTIL.minute);
}

/** Trễ = QUA mốc của khung: sáng sau 8h05 (tới hết buổi sáng), chiều sau 14h05 và không quá 17h30 (sau 17h30 không ghi nhận). */
export function isLateAttendance(session: AttendanceSession, hour: number, minute: number): boolean {
    if (!isRecordedAttendance(hour, minute)) return false;
    const cutoff = LATE_AFTER[session];
    return hour > cutoff.hour || (hour === cutoff.hour && minute > cutoff.minute);
}
