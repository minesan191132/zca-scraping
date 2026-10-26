import type { ReportDefinition } from "../types.js";
import { techDefinition } from "./common.js";

/** CÔNG VIỆC ĐẦU CA LÀM: tin gửi trong ngày đến hết 09:00 (mốc thật lấy từ `config.techReports.shiftStartUntil`, xem loader.ts). Phòng máy "PM2" thành 2; "Công việc thực hiện" nhận cả các dòng sau. */
export const shiftStart: ReportDefinition = techDefinition({
    code: "shiftStart",
    label: "CÔNG VIỆC ĐẦU CA LÀM",
    titleScope: "shiftStart",
    labelScope: "shiftStart",
    sheet: "ĐẦU CA",
    lastColumn: "K",
    cutoff: "09:00",
    continuationLabel: "cong viec thuc hien",
    columns: [
        { column: "F", labels: ["truong nhom it"], convert: "text" },
        { column: "G", labels: ["bat dau gio lam"], convert: "clock" },
        { column: "H", labels: ["phong may truong"], convert: "roomNumbers" },
        { column: "I", labels: ["phong may cong ty"], convert: "roomNumbers" },
        { column: "J", labels: ["phong may lam viec"], convert: "roomNumbers" },
        { column: "K", labels: ["cong viec thuc hien"], convert: "text" },
    ],
});
