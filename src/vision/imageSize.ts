export interface ImageSize {
    width: number;
    height: number;
}

/**
 * Rộng và cao của ảnh JPEG hoặc PNG, đọc từ những byte đầu (không giải mã ảnh, không thư viện). `null` khi không nhận ra hoặc file bị cắt.
 */
export function imageSizeOf(buf: Buffer): ImageSize | null {
    if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
        let i = 2;
        while (i + 9 < buf.length) {
            if (buf[i] !== 0xff) {
                i++;
                continue;
            }
            const marker = buf[i + 1];
            if (marker === 0xff) {
                i++; // byte đệm
                continue;
            }
            if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
                i += 2; // marker không có độ dài
                continue;
            }
            if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
            }
            i += 2 + buf.readUInt16BE(i + 2);
        }
    }
    return null;
}
