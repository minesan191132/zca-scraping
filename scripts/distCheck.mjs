// Phép kiểm cho bản gộp `dist/`: những thư mục nghiệp vụ không được lọt vào gói của Beta.
const FORBIDDEN = ["lesson", "master", "leave", "minutes", "vision", "ocr", "total", "reportSets", "chat"];
const RE = new RegExp(String.raw`(^|[\\/])src[\\/](${FORBIDDEN.join("|")})[\\/]`);

/** Các đường vào của metafile esbuild thuộc thư mục nghiệp vụ. */
export function forbiddenInputs(metafile) {
    return Object.keys(metafile.inputs).filter((p) => RE.test(p));
}

/** Điểm vào chỉ dành cho tác giả: không được có trong gói (nó ký giấy phép bằng khóa riêng). */
const AUTHOR_ONLY = ["issue-license"];

/** Các điểm vào (tên hay đường dẫn, có hoặc không đuôi) là lệnh cấp giấy phép. */
export function forbiddenEntries(entries) {
    return entries.filter((e) => {
        const base = e.split(/[/\\]/).pop().replace(/[.][cm]?[jt]s$/, "");
        return AUTHOR_ONLY.includes(base);
    });
}

/** Văn bản có chứa một khóa riêng dạng PEM. */
export function containsPrivateKey(text) {
    return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text);
}

const escapePkg = (name) => name.replace(/[.]/g, "[.]");

/**
 * Các gói trong `externals` bị `import ... from "<gói>"`, `import "<gói>"` hay `export ... from "<gói>"` ở mức cao nhất.
 * Máy khách không có `node_modules`, nên import tĩnh một gói ngoài làm cả file chết ngay lúc nạp.
 */
export function staticExternalImports(outputText, externals) {
    return externals.filter((name) => {
        const re = new RegExp(String.raw`(?:^|[;{}\n])\s*(?:import|export)\s*(?:[^'";()]*?\bfrom\s*)?["']${escapePkg(name)}(?:/[^"']*)?["']`);
        return re.test(outputText);
    });
}

/** Các gói trong `externals` được nạp bằng `import("<gói>")` động (được phép, chỉ để liệt kê trong báo cáo). */
export function dynamicExternalImports(outputText, externals) {
    return externals.filter((name) => new RegExp(String.raw`import\(\s*["']${escapePkg(name)}(?:/[^"']*)?["']\s*\)`).test(outputText));
}
