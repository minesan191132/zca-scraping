import { config } from "../../config.js";

/** Nhóm được gom và đọc ảnh: `vision.leave.groups`, dùng chung cho ảnh lịch nghỉ phép và ảnh biên bản. Mỗi ảnh trong các nhóm này được phân loại (nghỉ phép, biên bản, hoặc khác); ảnh đo tốc độ không còn được đọc. */
export function visionGroups(): string[] {
    return [...new Set(config.vision.leave.groups)];
}
