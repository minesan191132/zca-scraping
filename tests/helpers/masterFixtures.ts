import XLSX from "xlsx";

/** Dựng file tổng GIẢ: hàng 3 là tiêu đề, dữ liệu từ hàng 4. Tệp 07 (opts.speed = false): C tên trường, D khu vực, H BẢO TRÌ GN. Tệp 08 (true): C, D, E PM, F TỐC ĐỘ, J NGÀY CẬP NHẬT. */
export function writeMasterFixture(
    file: string,
    sheets: Record<string, Array<[string, string, string | null, number | null, number | null]>>,
    opts: { speed: boolean },
): void {
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(sheets)) {
        const aoa: unknown[][] = [["TIN HỌC ĐẠI DƯƠNG"], [], []];
        aoa[2] = opts.speed
            ? ["STT", "CẤP", "TÊN TRƯỜNG", "KHU VỰC", "PM", "TỐC ĐỘ ", "XẾP LOẠI", "LÍ DO", "ĐỀ XUẤT", "NGÀY CẬP NHẬT", "GHI CHÚ"]
            : ["STT", "CẤP", "TÊN TRƯỜNG", "KHU VỰC", "TỔNG PM", "PM TRƯỜNG", "PM CTY", "BẢO TRÌ GN", "SỐ NGÀY", "XẾP LOẠI", "GHI CHÚ"];
        for (const [school, khuVuc, room, date, speed] of rows) {
            aoa.push(
                opts.speed
                    ? [null, null, school, khuVuc, room, speed, null, null, null, date, null]
                    : [null, null, school, khuVuc, null, null, null, date, null, null, null],
            );
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
    }
    XLSX.writeFile(wb, file);
}
