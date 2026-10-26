import type { ReportDefinition } from "../types.js";
import { ATTENDANCE_COLUMNS, techDefinition } from "./common.js";

/** ĐIỂM DANH ĐẦU BUỔI: tin gửi trong ngày đến hết 08:30 (mốc thật lấy từ `config.techReports.attendanceStartUntil`, xem loader.ts). */
export const attendanceStart: ReportDefinition = techDefinition({
    code: "attendanceStart",
    label: "ĐIỂM DANH ĐẦU BUỔI",
    titleScope: "attendanceStart",
    labelScope: "attendance",
    sheet: "ĐẦU BUỔI",
    lastColumn: "J",
    cutoff: "08:30",
    columns: ATTENDANCE_COLUMNS,
});
