import type { ReportDefinition } from "../types.js";
import { attendanceEnd } from "./attendanceEnd.js";
import { attendanceStart } from "./attendanceStart.js";
import { shiftEnd } from "./shiftEnd.js";
import { shiftStart } from "./shiftStart.js";

/** Định nghĩa dựng sẵn, gộp vào mã (không đọc đĩa) để chạy được cả sau khi esbuild gộp thành dist/. Trùng mã với định nghĩa của khách thì bản này thắng. */
export const BUILTIN_DEFINITIONS: ReportDefinition[] = [attendanceStart, attendanceEnd, shiftStart, shiftEnd];
