import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Một JPEG tối giản chỉ có phần đầu: APP0 rồi SOF (`marker` 0xc0 là baseline, 0xc2 là progressive). Đủ để đọc rộng và cao. */
export function jpegBytes(width: number, height: number, marker = 0xc0): Buffer {
    return Buffer.concat([
        Buffer.from([0xff, 0xd8]),
        Buffer.from([0xff, 0xe0, 0x00, 0x10]),
        Buffer.alloc(14),
        Buffer.from([0xff, marker, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03]),
        Buffer.alloc(9),
    ]);
}

/** Một PNG tối giản chỉ có chữ ký và khối IHDR. */
export function pngBytes(width: number, height: number): Buffer {
    const b = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
    b.writeUInt32BE(13, 8);
    b.write("IHDR", 12, "ascii");
    b.writeUInt32BE(width, 16);
    b.writeUInt32BE(height, 20);
    return b;
}

/** Thư mục tạm có `01.jpg`, `02.jpg`... mỗi ảnh một kích thước; thêm một byte cuối khác nhau để nội dung không trùng. */
export function bundleDirWithImages(sizes: Array<[number, number]>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scan-"));
    sizes.forEach(([w, h], i) => fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(2, "0")}.jpg`), Buffer.concat([jpegBytes(w, h), Buffer.from([i + 1])])));
    return dir;
}
