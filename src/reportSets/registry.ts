import { LEAVE_SOURCE_TITLE, MESSAGE_TITLES, MINUTES_SOURCE_TITLE, PHASE_SOURCE_TITLE, REPORT_LABELS } from "../constants/reportTitles.js";
import { ATTENDANCE_LAYOUT } from "../lesson/attendanceRows.js";
import { CLEANING_LAYOUT } from "../lesson/cleaningRows.js";
import { FILE_LAYOUT, type FileLayout } from "../lesson/statusReportLayout.js";
import { LEAVE_LAYOUT } from "../leave/layout.js";
import { INTERNET_SPEED_LAYOUT } from "../lesson/internetSpeedRows.js";
import { MINUTES_LAYOUT } from "../lesson/minutesRows.js";
import { MAINTENANCE_LAYOUT } from "../lesson/maintenanceRows.js";
import { TECH_LAYOUT } from "../lesson/techReportRows.js";

/**
 * Mã nội bộ của từng báo cáo. Mã là DANH TÍNH ỔN ĐỊNH: tên file mẫu và tiêu đề đọc từ ô A1 của mẫu có thể đổi (LOA đã đổi thành
 * ÂM THANH) mà mã `loa` giữ nguyên, nên `config.reportSets[].reports` ghi mã, không ghi tên file hay tiêu đề.
 * THỨ TỰ Ở ĐÂY LÀ THỨ TỰ XUẤT FILE VÀ IN (NETSUPPORT, ÂM THANH, INTERNET, MÁY TÍNH, ĐIỆN, VỆ SINH, NỘI QUY, NGHỈ PHÉP).
 */
export const REPORT_KEYS = ["netsupport", "loa", "internet", "mayTinh", "dien", "cleaning", "attendance", "leave", "maintenance", "internetSpeed", "minutes", "attendanceStart", "attendanceEnd", "shiftStart", "shiftEnd"] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

/** `phase`: dựng theo từng giai đoạn trong ngày (4 giai đoạn). `day`: một file mỗi ngày, quét lại cả ngày. */
export type ReportKind = "phase" | "day";

export interface ReportDef {
    key: ReportKey;
    kind: ReportKind;
    /** Tên hiển thị gọn, chỉ để in trong `reports:list` và thông báo lỗi. */
    label: string;
    /** Tiêu đề dòng đầu của tin nguồn (mô tả; việc nhận diện thật nằm ở `src/lesson/*Report.ts`). */
    source: string;
    layout: FileLayout;
}

export const REPORT_DEFS: Record<ReportKey, ReportDef> = {
    netsupport: { key: "netsupport", kind: "phase", label: REPORT_LABELS.netsupport, source: PHASE_SOURCE_TITLE, layout: FILE_LAYOUT.netsupport },
    loa: { key: "loa", kind: "phase", label: REPORT_LABELS.loa, source: PHASE_SOURCE_TITLE, layout: FILE_LAYOUT.loa },
    internet: { key: "internet", kind: "phase", label: REPORT_LABELS.internet, source: PHASE_SOURCE_TITLE, layout: FILE_LAYOUT.internet },
    mayTinh: { key: "mayTinh", kind: "phase", label: REPORT_LABELS.mayTinh, source: PHASE_SOURCE_TITLE, layout: FILE_LAYOUT.mayTinh },
    dien: { key: "dien", kind: "day", label: REPORT_LABELS.dien, source: MESSAGE_TITLES.electric, layout: FILE_LAYOUT.dien },
    cleaning: { key: "cleaning", kind: "day", label: REPORT_LABELS.cleaning, source: MESSAGE_TITLES.shiftEnd, layout: CLEANING_LAYOUT },
    attendance: { key: "attendance", kind: "day", label: REPORT_LABELS.attendance, source: MESSAGE_TITLES.attendanceStart, layout: ATTENDANCE_LAYOUT },
    leave: { key: "leave", kind: "day", label: REPORT_LABELS.leave, source: LEAVE_SOURCE_TITLE, layout: LEAVE_LAYOUT },
    maintenance: { key: "maintenance", kind: "day", label: REPORT_LABELS.maintenance, source: MESSAGE_TITLES.shiftEnd, layout: MAINTENANCE_LAYOUT },
    internetSpeed: { key: "internetSpeed", kind: "day", label: REPORT_LABELS.internetSpeed, source: MESSAGE_TITLES.shiftEnd, layout: INTERNET_SPEED_LAYOUT },
    minutes: { key: "minutes", kind: "day", label: REPORT_LABELS.minutes, source: MINUTES_SOURCE_TITLE, layout: MINUTES_LAYOUT },
    attendanceStart: { key: "attendanceStart", kind: "day", label: REPORT_LABELS.attendanceStart, source: MESSAGE_TITLES.attendanceStart, layout: TECH_LAYOUT.attendanceStart },
    attendanceEnd: { key: "attendanceEnd", kind: "day", label: REPORT_LABELS.attendanceEnd, source: MESSAGE_TITLES.attendanceEnd, layout: TECH_LAYOUT.attendanceEnd },
    shiftStart: { key: "shiftStart", kind: "day", label: REPORT_LABELS.shiftStart, source: MESSAGE_TITLES.shiftStart, layout: TECH_LAYOUT.shiftStart },
    shiftEnd: { key: "shiftEnd", kind: "day", label: REPORT_LABELS.shiftEnd, source: MESSAGE_TITLES.shiftEnd, layout: TECH_LAYOUT.shiftEnd },
};

export const PHASE_REPORT_KEYS: ReportKey[] = REPORT_KEYS.filter((k) => REPORT_DEFS[k].kind === "phase");
export const DAY_REPORT_KEYS: ReportKey[] = REPORT_KEYS.filter((k) => REPORT_DEFS[k].kind === "day");

export function isReportKey(v: unknown): v is ReportKey {
    return typeof v === "string" && (REPORT_KEYS as readonly string[]).includes(v);
}
