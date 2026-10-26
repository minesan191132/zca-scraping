import { classifyTechTitle, type TechKey } from "../lesson/techReport.js";
import type { Manifest } from "../types/index.js";

/**
 * Tiêu đề tin mà ảnh đi kèm gần như chắc chắn KHÔNG phải ảnh nghỉ phép hay biên bản: điểm danh đầu/cuối buổi và công việc đầu ca. CÔNG VIỆC CUỐI CA LÀM
 * cố tình KHÔNG nằm đây vì ảnh biên bản đi cùng tin đó (báo cáo `minutes`). Danh sách chặn tiêu đề đã biết, không phải danh sách cho phép, nên tin kèm
 * lạ ("em xin nghỉ") hay không có tin kèm đều đi đường cũ.
 */
const NO_PHOTO_TITLES: ReadonlySet<TechKey> = new Set<TechKey>(["attendanceStart", "attendanceEnd", "shiftStart"]);

/** Dòng đầu của tin, dùng làm nhãn ghi vào log và reading.json. */
const firstLine = (content: string): string => content.split(/\r?\n/).find((l) => l.trim() !== "")?.trim() ?? "";

/**
 * Tiêu đề gây nghi của bộ, hoặc null khi bộ không bị nghi. Hàm thuần.
 * Một tin CÔNG VIỆC CUỐI CA LÀM trong cùng bộ (cùng người gửi, trong cửa sổ tin chữ) là bằng chứng ảnh biên bản có thể ở đây nên bộ không bị nghi dù còn
 * tin điểm danh: người trực hay gửi hai tin cạnh nhau, và nếu bỏ nhầm thì mất biên bản.
 */
export function suspectTitle(manifest: Pick<Manifest, "texts">): string | null {
    const kinds = manifest.texts.map((t) => classifyTechTitle(t.content));
    if (kinds.includes("shiftEnd")) return null;
    const i = kinds.findIndex((k) => k !== null && NO_PHOTO_TITLES.has(k));
    return i < 0 ? null : firstLine(manifest.texts[i].content);
}
