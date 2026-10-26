import type { ReportDefinition } from "../types.js";
import { techDefinition } from "./common.js";

/** CÔNG VIỆC CUỐI CA LÀM: tin gửi trong ngày đến hết 12:00 (mốc thật lấy từ `config.techReports.shiftEndUntil`, xem loader.ts). Chép nguyên văn; chỉ phòng máy, tốc độ, máy lạnh và camera được chuẩn hoá. */
export const shiftEnd: ReportDefinition = techDefinition({
    code: "shiftEnd",
    label: "CÔNG VIỆC CUỐI CA LÀM",
    titleScope: "shiftEnd",
    labelScope: "shiftEnd",
    sheet: "CUỐI CA",
    lastColumn: "U",
    cutoff: "12:00",
    columns: [
        { column: "F", labels: ["truong nhom it"], convert: "text" },
        { column: "G", labels: ["ket thuc gio lam"], convert: "clock" },
        { column: "H", labels: ["phong may lam viec"], convert: "roomNumbers" },
        { column: "I", labels: ["tong so may"], convert: "numberOrText" },
        { column: "J", labels: ["so may hoat dong"], convert: "numberOrText" },
        { column: "K", labels: ["so may con loi"], convert: "numberOrText" },
        { column: "L", labels: ["hdh windows"], convert: "text" },
        { column: "M", labels: ["phan mem ms office"], convert: "text" },
        { column: "N", labels: ["tinh trang netsupport"], convert: "text" },
        { column: "O", labels: ["tinh trang am thanh"], convert: "text" },
        { column: "P", labels: ["toc do internet"], convert: "speedMbps" },
        { column: "Q", labels: ["hien trang may lanh"], convert: "bulletList" },
        { column: "R", labels: ["camera ho tro"], convert: "leadingNumber" },
        { column: "S", labels: ["ve sinh phong may"], convert: "text" },
        { column: "T", labels: ["hoan thien bao tri"], convert: "text" },
        { column: "U", labels: ["hinh anh phong may"], convert: "text" },
    ],
});
