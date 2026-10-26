import type { ReportDefinition } from "../types.js";
import { ATTENDANCE_COLUMNS, techDefinition } from "./common.js";

/** ĐIỂM DANH CUỐI BUỔI: tin gửi trong ngày đến hết 12:30 (mốc thật lấy từ `config.techReports.attendanceEndUntil`, xem loader.ts). */
export const attendanceEnd: ReportDefinition = techDefinition({
    code: "attendanceEnd",
    label: "ĐIỂM DANH CUỐI BUỔI",
    titleScope: "attendanceEnd",
    labelScope: "attendance",
    sheet: "CUỐI BUỔI",
    lastColumn: "J",
    cutoff: "12:30",
    columns: ATTENDANCE_COLUMNS,
});
