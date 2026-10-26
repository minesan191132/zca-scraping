/** "HH:MM" (hoặc "H:MM") thành số phút trong ngày; ném lỗi khi sai dạng (config sai thì báo ngay lúc khởi động). Không import config để configCheck dùng được. */
export function parseCutoff(text: string): number {
    const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error(`mốc giờ phải có dạng HH:MM, từ 00:00 đến 23:59 (đang là ${JSON.stringify(text)})`);
    return Number(m[1]) * 60 + Number(m[2]);
}
