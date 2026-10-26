import path from "node:path";
import { fileURLToPath } from "node:url";

/** Các đường dẫn suy ra từ hai gốc: `codeRoot` (mã, tài nguyên đi kèm; chỉ đọc khi đã cài) và `home` (dữ liệu, cấu hình, đầu ra; ghi được). */
export interface AppPaths {
    codeRoot: string;
    home: string;
    srcDir: string;
    distDir: string;
    scriptsDir: string;
    outputDir: string;
    chatRulesPath: string;
    photoRulesDir: string;
    templatesDir: string;
}

/**
 * `home` bỏ trống thì bằng `codeRoot` và mọi đường dẫn giữ như trước khi có bản cài (máy chạy từ mã nguồn không đổi gì).
 * Đặt `home` (biến môi trường `ZBOT_HOME`, do panel đặt) thì đầu ra, luật chat và mẫu Excel nằm dưới `home`; mã, `scripts/` và `photo-rules/` vẫn dưới `codeRoot`.
 */
export function resolveAppPaths(codeRoot: string, home: string | undefined): AppPaths {
    const h = home ?? codeRoot;
    return {
        codeRoot,
        home: h,
        srcDir: path.join(codeRoot, "src"),
        distDir: path.join(codeRoot, "dist"),
        scriptsDir: path.join(codeRoot, "scripts"),
        outputDir: path.join(h, "output"),
        chatRulesPath: path.join(h, "chat-rules.json"),
        photoRulesDir: path.join(codeRoot, "photo-rules"),
        // Mẫu Excel trong bản chạy từ mã nguồn nằm cạnh thư mục dự án (`<workspace>/templates`); khi có `home` riêng thì nằm trong `home`.
        templatesDir: home === undefined ? path.resolve(codeRoot, "..", "templates") : path.join(home, "templates"),
    };
}

/**
 * Every path the code derives from where the project lives, in one place. This is the ONLY file that may use `import.meta.url`:
 * once the CLIs are bundled into `dist/cli/x.js` the depth from this file changes, so the panel sets `ZBOT_CODE_ROOT` and the
 * depth-based guess below is only the fallback for running from source (this file sits at `src/core/`, two levels below the root).
 * The data folder is `config.dataDir`, not here, because it is a setting.
 */
export const repoRoot = process.env.ZBOT_CODE_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const app = resolveAppPaths(repoRoot, process.env.ZBOT_HOME);

/** Gốc dữ liệu ghi được: `ZBOT_HOME` nếu có, không thì thư mục dự án. `config.json` nằm ở đây. */
export const appHome = app.home;

/** Source folder; the runner spawns the command-line scripts under `src/cli/` from here. */
export const srcDir = app.srcDir;

/** Bundled CLIs (`dist/cli/*.js`); the runner spawns these instead of `src/` when `ZBOT_BUNDLED=1`. */
export const distDir = app.distDir;

/** Extractor and runner output (`output.json`, `review*.json`, `runner-log.jsonl`, ...). */
export const outputDir = app.outputDir;

/** PowerShell helpers such as the Excel filler. */
export const scriptsDir = app.scriptsDir;

/** Excel templates live next to the project folder (`<workspace>/templates`), not inside it (or under `ZBOT_HOME` when it is set). */
export const templatesDir = app.templatesDir;

/**
 * Folder of one day's status reports: `<root>/<yyMM>/<yyMMdd>`, `root` being `config.statusExportDir`. `day` is `YYYY-MM-DD`
 * or `yyMMdd`. Every exporter (the 4 phases and `bot:total`) goes through here so they always agree on the layout.
 */
export function statusReportDir(root: string, day: string): string {
    const yyMMdd = /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.slice(2, 4) + day.slice(5, 7) + day.slice(8, 10) : day;
    return path.join(root, yyMMdd.slice(0, 4), yyMMdd);
}

/**
 * Folder of ONE person's reports for a day: `<root>/<yyMM>/<yyMMdd>/<setId>`. The person's folder sits INSIDE the day, so
 * `statusReportDir` keeps its signature and the old per-day folder is simply the parent of every person's folder.
 */
export function setReportDir(root: string, setId: string, day: string): string {
    return path.join(statusReportDir(root, day), setId);
}

/** Work folder of one report set: `output/<setId>/` holds its `output.json`, `marks.json`, `review*.json`, `meta.json`, `overrides.json`. */
export function setOutputDir(setId: string): string {
    return path.join(outputDir, setId);
}

/** The chat rules file the user edits. */
export const chatRulesPath = app.chatRulesPath;

/** Luật cho từng loại ảnh (được commit): `photo-rules/<mã>.json`. */
export const photoRulesDir = app.photoRulesDir;

/** Đáp án đúng của người dùng để đo độ chính xác (được commit): `photo-golden/<mã luật>.json`. */
export const photoGoldenDir = path.join(repoRoot, "photo-golden");

/** Các bộ ảnh dẫn xuất: `<dataDir>/photo-reports/<yyyy-MM-dd>/<mã nhóm>/<mã bộ>/`. `dataDir` là `config.dataDir`. */
export function photoReportsDir(dataDir: string): string {
    return path.join(dataDir, "photo-reports");
}
