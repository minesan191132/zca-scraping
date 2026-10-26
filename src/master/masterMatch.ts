import type { MasterRow } from "./masterIndex.js";
import { areaKey, norm } from "./masterKeys.js";

export type Match = { kind: "ok"; row: MasterRow } | { kind: "none" } | { kind: "ambiguous"; count: number } | { kind: "other_area" };

/**
 * Tìm đúng MỘT dòng của file tổng cho (trường, khu vực, phòng). `room = null` bỏ qua phòng (tệp bảo trì chỉ có một dòng mỗi trường). Nhiều dòng trùng khóa thì
 * thu hẹp theo khu vực; vẫn không còn đúng một dòng thì "mơ hồ". Một dòng duy nhất nhưng KHÁC khu vực (cả hai đều có khu vực) là trường khác cùng tên: "other_area".
 * Người gọi không ghi gì với kết quả khác "ok" và đưa mục vào danh sách cần xem.
 */
export function findRow(rows: MasterRow[], key: string, khuVuc: string, room: string | null): Match {
    const hits = rows.filter((r) => r.schoolKey === key && (room === null || r.room === room));
    if (hits.length === 0) return { kind: "none" };
    const kv = norm(khuVuc);
    // Khu vực khớp NGUYÊN VĂN thắng; chỉ khi không dòng nào khớp nguyên văn mới so qua bảng mã ("THỦ ĐỨC" với "TĐ"). Nhờ vậy file có cả "q9" lẫn "td" vẫn phân biệt được như trước.
    const sameArea = (r: MasterRow): boolean => r.khuVuc === kv || areaKey(r.khuVuc) === areaKey(khuVuc);
    if (hits.length === 1) {
        const r = hits[0];
        return r.khuVuc && kv && !sameArea(r) ? { kind: "other_area" } : { kind: "ok", row: r };
    }
    const exact = kv ? hits.filter((r) => r.khuVuc === kv) : [];
    if (exact.length === 1) return { kind: "ok", row: exact[0] };
    if (exact.length === 0 && kv) {
        const byCode = hits.filter(sameArea);
        if (byCode.length === 1) return { kind: "ok", row: byCode[0] };
    }
    return { kind: "ambiguous", count: hits.length };
}

/**
 * Như `findRow` nhưng thử lần lượt nhiều khóa (xem `schoolKeys`): khóa đầu tiên cho kết quả "ok" thắng; không khóa nào "ok" thì trả kết quả của khóa ĐẦU TIÊN
 * không phải "none" (để danh sách cần xem nói đúng lý do: mơ hồ, khác khu vực), cuối cùng mới là "none".
 */
export function findSchoolRow(rows: MasterRow[], keys: string[], khuVuc: string, room: string | null): Match {
    let firstMiss: Match = { kind: "none" };
    for (const key of keys) {
        const m = findRow(rows, key, khuVuc, room);
        if (m.kind === "ok") return m;
        if (firstMiss.kind === "none") firstMiss = m;
    }
    return firstMiss;
}
