import type { ImageSize } from "./imageSize.js";

/** Loại của một ảnh theo chữ OCR: ba loại có luật, `khong_chac` (có dấu hiệu nhưng chưa đủ) và `khac` (không dấu hiệu nào). */
export type ImageClass = "leave" | "speedtest" | "bienban" | "khong_chac" | "khac";
type Kind = "leave" | "speedtest" | "bienban";
const KINDS: Kind[] = ["leave", "speedtest", "bienban"];

export interface ClassifyResult {
    cls: ImageClass;
    scores: Record<Kind, number>;
}

/** Điểm cao nhất phải đạt mức này (và hơn hẳn điểm thứ hai) thì mới chọn một loại. */
const THRESHOLD = 4;

/** Bỏ dấu, chữ thường, gộp khoảng trắng: để so khớp chữ OCR không phụ thuộc dấu tiếng Việt. */
export const normalizeText = (s: string): string =>
    s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/gi, "d")
        .toLowerCase()
        .replace(/\s+/g, " ");

/** Tín hiệu theo chữ (đã bỏ dấu) của từng loại, kèm điểm. Tiêu đề công ty KHÔNG nằm ở đây: bảng nghỉ phép và biên bản dùng chung nó. */
const CUES: Record<Kind, Array<[RegExp, number]>> = {
    speedtest: [
        [/internet\s*speed/, 5],
        [/\bmbps\b|\bkbps\b|\bgbps\b|mb\/s/, 4],
        [/fast\.com|speedtest|speed\s*test/, 5],
        [/your\s*internet/, 3],
    ],
    leave: [
        [/nghi\s*phep/, 5],
        [/da\s*duyet/, 3],
        [/nhan\s*vien\s*bao\s*cao/, 3],
        [/ngay\s*bao\s*cao/, 2],
        [/ho\s*ten/, 1],
        [/so\s*ngay/, 1],
        [/dung\s*qd|xep\s*loai|chu\s*giai/, 2],
    ],
    bienban: [
        [/bien\s*ban/, 4],
        [/ban\s*giao/, 4],
        [/linh\s*kien/, 3],
        [/xac\s*nhan\s*nha\s*truong/, 3],
        [/dai\s*dien\s*(cong\s*ty|nha\s*truong)/, 3],
        [/phong\s*may/, 1],
        [/ten\s*thiet\s*bi|tinh\s*trang/, 1],
    ],
};

/** Tiêu đề công ty có trên cả bảng nghỉ phép lẫn biên bản. */
const HEADING = /tin\s*hoc|dai\s*duong|cong\s*ty\s*tnhh/;

/**
 * Xếp một ảnh vào loại, từ chữ OCR và kích thước ảnh (`null` khi không đọc được kích thước).
 * Ngoài chữ còn có hai dấu hiệu hình dạng, chỉ tính khi có tiêu đề công ty: bảng nghỉ phép là ảnh xuất từ Excel nằm ngang (rộng ít nhất gấp đôi cao, nhiều
 * ký tự kẻ bảng), còn biên bản là ảnh chụp đứng. Hàm thuần.
 */
export function classifyImage(text: string, size: ImageSize | null): ClassifyResult {
    const t = normalizeText(text);
    const scores: Record<Kind, number> = { leave: 0, speedtest: 0, bienban: 0 };
    for (const kind of KINDS) scores[kind] = CUES[kind].reduce((sum, [re, weight]) => sum + (re.test(t) ? weight : 0), 0);

    const heading = HEADING.test(t);
    if (heading && size) {
        const bars = (text.match(/[|[\]]/g) ?? []).length;
        if (size.width >= 2 * size.height && bars >= 10) scores.leave += 4;
        if (size.height > size.width) scores.bienban += 2;
    }

    const ranked = KINDS.map((k) => [k, scores[k]] as const).sort((a, b) => b[1] - a[1]);
    const [top, second] = ranked;
    if (top[1] >= THRESHOLD && top[1] > second[1]) return { cls: top[0], scores };
    return { cls: heading || top[1] >= 2 ? "khong_chac" : "khac", scores };
}
