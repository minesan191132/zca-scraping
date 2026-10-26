# Panel C1: chạy bản đã gộp, lệnh trạng thái gộp được, giấy phép

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel (Electron) trên máy không có Node chạy được các CLI đã gộp (`dist/cli/*.js`), đọc trạng thái bot đã gộp, ghi cấu hình thật vào `config.json`, và bot đã gộp từ chối chạy khi không có giấy phép hợp lệ.

**Architecture:** Hai lớp. (1) Phía bot (`src/`): giấy phép Ed25519 kiểm ngoại tuyến (`src/core/license.ts`), cổng giấy phép trong các CLI điều khiển Zalo khi `ZBOT_BUNDLED=1`, hai lệnh trạng thái gộp được (`dispatch-status`, `watch-status-core`), CLI cấp giấy phép chỉ cho tác giả. (2) Phía panel (`panel/`): chế độ "bản cài" bên cạnh chế độ "chạy từ mã nguồn" hiện tại (chọn bằng `app.isPackaged` và sự có mặt của `resources/dist`): chạy CLI bằng chính file Electron với `ELECTRON_RUN_AS_NODE=1`, không cần thư mục dự án và `package.json`, ghi `config.json` lồng nhau thay cho `settings.draft.json`, màn hình trạng thái giấy phép.

**Tech Stack:** TypeScript, `node:crypto` (Ed25519), Electron, Svelte 5, Vitest, `node:test`. Không thêm phụ thuộc.

**Spec:** `docs/superpowers/specs/2026-10-24-ban-cai-dat-ban-cho-nguoi-khac-design.md` (mục "Quyết định sản phẩm do advisor đưa" và "Thiết kế đề xuất"). Plan này KHÔNG làm: màn hình thiết lập lần đầu và `electron-updater` (plan C2), bộ máy báo cáo trong gói bán (plan sau), bot chat.

## Global Constraints

- Tên sản phẩm "Báo Cáo Nhóm", `appId` `com.baocaonhom.app`, `executableName` `bao-cao-nhom`, thư mục dữ liệu `%LOCALAPPDATA%\BaoCaoNhom`; không có "Zalo", "Beta" trong ba giá trị cuối (spec).
- Giấy phép: Ed25519 bằng `node:crypto`, file `{ "payload": "<chuỗi JSON>", "sig": "<base64>" }`, chữ ký phủ đúng các byte của `payload`; payload gồm `customer`, `machineId`, `issuedAt`, `expiresAt`; `machineId` là `MachineGuid` của `HKLM\SOFTWARE\Microsoft\Cryptography`; giấy phép Beta hạn 90 ngày; file ở `ZBOT_HOME`, không ở thư mục cài (spec).
- Khóa riêng KHÔNG vào repo nào, bộ cài, hay `dist/`; lệnh cấp giấy phép KHÔNG là điểm vào của `dist` (spec, advisor).
- Bot đã gộp từ chối chạy khi giấy phép thiếu, hết hạn hoặc sai, nói rõ lý do; `config-dump` vẫn chạy (spec).
- Máy tác giả (chạy từ mã nguồn, không `ZBOT_BUNDLED`) không bị chặn bởi giấy phép.
- Tham số tiến trình con truyền bằng mảng, không qua shell (đường cài có khoảng trắng).
- Import trong `src/` có đuôi `.js`; chú thích tiếng Việt, theo file lân cận (Rule 1). Panel theo quy ước của `panel/` (eslint, vitest, import `@shared/*`).
- Subagent KHÔNG chạy `bot:*`, `today`, `total:once`, `runner:once`, `fill:*`, `sync:db`, mở Zalo hay Excel, và KHÔNG chạy Electron (`npm run dev`, `build:*`); chỉ `npm run typecheck`, `npm test` ở gốc, `npm run lint`, `npm test`, `npm run typecheck` trong `panel/` (Rule 4). Agent chính tự kiểm Electron (Task 8).
- Lệnh commit chỉ chạy khi người dùng đã duyệt việc thực thi.

## Review Focus

1. Giấy phép hết hạn đúng ranh giới (`now === expiresAt` coi là hết hạn) và sai máy: bot từ chối với lý do khác nhau, không crash (Task 1, 2).
2. File giấy phép bị sửa một byte trong `payload`, hay `sig` hỏng, hay JSON lỗi: từ chối, không ném (Task 1).
3. `config-dump` vẫn chạy khi không có giấy phép (Task 2) và khi `config.json` hỏng thì panel hiện lỗi dễ hiểu thay vì trang trắng (Task 6).
4. Khóa riêng không lọt vào `dist/`: `distCheck` kiểm điểm vào cấp giấy phép không có trong gói và không file nào chứa `BEGIN PRIVATE KEY` (Task 3).
5. Panel ở chế độ bản cài không đòi chọn thư mục dự án, không gọi `npm`, và đường cài có khoảng trắng chạy được (Task 4, 5).
6. Bản nháp `settings.draft.json` cũ không mất: lần mở đầu của chế độ bản cài không đọc nó (nó thuộc chế độ mã nguồn) (Task 6).

## Phân việc (Rule 4)

Worktree do agent chính tạo bằng `git worktree add` ở `<thư mục cha>\wt-<tên>` (tham số `isolation: "worktree"` của công cụ trỏ vào repo của phiên, không phải Beta; đã ghi ở sổ tiến độ), nối `node_modules` bằng junction, và nhớ gỡ junction trước khi xóa worktree.

- **Phần A (bot):** Task 1 đến 3. Subagent A. Sở hữu: `src/core/license.ts`, `src/cli/issue-license.ts`, `src/cli/dispatch-status.ts`, `src/cli/watch-status-core.ts`, `src/cli/bot-watch-core.ts`, `src/cli/bot-dispatch.ts`, `src/cli/bot-scrape.ts` (chỉ thêm cổng), `scripts/build-dist.mjs`, `scripts/distCheck.mjs`, `tests/license*.test.ts`, `tests/dispatchStatus.test.ts`, `tests/watchStatusCore.test.ts`.
- **Phần B (panel):** Task 4 đến 7. Subagent B, bắt đầu SAU khi phần A gộp (cần tên lệnh và định dạng dòng trạng thái). Sở hữu: `panel/src/main/command.ts`, `panel/src/main/bots.ts`, `panel/src/main/project.ts`, `panel/src/main/config-bridge.ts`, `panel/src/main/config-json.ts`, `panel/src/main/license.ts` (file mới và các file main có sẵn kể trên), `panel/tests/**`. KHÔNG sửa `panel/src/shared/**` (Rule 4: mọi file `panel/src/shared/*` chỉ agent chính sửa), `panel/src/preload/**`, `panel/src/main/index.ts`, `panel/src/main/ipc.ts`; các thay đổi cần ở đó (kiểu mới trong `shared/ipc.ts`, `BUNDLED_BOT_IDS` trong `shared/bots.ts`, kênh mới trong `preload/index.ts` và `ipc.ts`) subagent ghi thành đoạn mã đề xuất trong báo cáo, agent chính áp dụng sau khi gộp. Kiểu dùng chung trong lúc làm: subagent khai báo cục bộ trong file `main/` của nó (và export), agent chính chuyển lên `shared/` khi gộp.
- **Agent chính:** `package.json` (script `license:issue`), `src/core/paths.ts` nếu cần, `panel/electron-builder.yml`, `panel/src/shared/**`, `panel/src/preload/**`, `panel/src/main/index.ts`, `panel/src/main/ipc.ts`, `panel/src/renderer/**` (giao diện), `CLAUDE.md`, `README.md`, tạo cặp khóa Ed25519 và cất khóa riêng, Task 8 (kiểm Electron).
- Thứ tự gộp: A, rồi B, rồi các file của agent chính. Sau gộp: `npm run typecheck` và `npm test` ở gốc; `npm run lint`, `npm test`, `npm run typecheck` trong `panel/`.
- Mỗi subagent nhận đường dẫn `<repo>\.claude\RULES\` (không nằm trong worktree; dán Rule 1 vào prompt).
- Plan này đi qua advisor trước khi giao subagent (Rule 2).

---

### Task 1: Giấy phép ký số (lõi, phần A)

**Files:**
- Create: `src/core/license.ts`
- Test: `tests/license.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface LicensePayload { customer: string; machineId: string; issuedAt: string; expiresAt: string } // hai ngày là ISO 8601
  export type LicenseFailure = "missing" | "bad-format" | "bad-signature" | "wrong-machine" | "expired";
  export type LicenseResult = { ok: true; payload: LicensePayload } | { ok: false; reason: LicenseFailure; detail?: string };
  export function verifyLicense(raw: string, opts: { machineId: string; now: number; publicKeyPem: string }): LicenseResult;
  export function signLicense(payload: LicensePayload, privateKeyPem: string): string; // trả chuỗi JSON của file giấy phép
  export function readMachineId(): string;      // MachineGuid qua `reg query` (execFile, mảng tham số), ném lỗi nêu rõ nếu không đọc được
  export const licensePath = (): string => path.join(appHome, "license.json");
  export const LICENSE_PUBLIC_KEY_PEM: string;  // khóa công khai nhúng; Task 8 thay bằng khóa thật
  export function checkLicense(now?: number): LicenseResult; // đọc licensePath(), readMachineId(), LICENSE_PUBLIC_KEY_PEM
  ```
- `verifyLicense` KHÔNG ném: file rỗng hoặc không phải JSON hoặc thiếu trường cho `bad-format`; chữ ký sai hay `payload` bị sửa cho `bad-signature`; `machineId` khác cho `wrong-machine`; `Date.parse(expiresAt) <= now` cho `expired` (đúng lúc hết hạn là hết hạn); thứ tự kiểm: định dạng, chữ ký, máy, hạn.
- `readMachineId`: `execFileSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])`, lấy GUID bằng regex; không dùng shell.

- [ ] **Step 1: Viết test hỏng** `tests/license.test.ts`, dùng cặp khóa tạo ngay trong test bằng `generateKeyPairSync("ed25519")` (xuất PEM). Các test: giấy phép hợp lệ cho `ok:true` và `payload.customer` đúng; đổi một ký tự trong `payload` cho `bad-signature`; `sig` không phải base64 hợp lệ cho `bad-signature` hoặc `bad-format` (chọn một, ghi rõ trong test); ký bằng khóa khác cho `bad-signature`; `machineId` khác cho `wrong-machine`; `now` bằng đúng `expiresAt` cho `expired`; `now` trước `expiresAt` 1 ms cho `ok`; chuỗi rỗng và `"{"` và `"{}"` cho `bad-format`; `readMachineId()` trả chuỗi khớp `/^[0-9a-f-]{36}$/i` (bỏ qua test nếu `process.platform !== "win32"`); `licensePath()` nằm dưới `appHome`.
- [ ] **Step 2: Chạy** `node --import tsx --test tests/license.test.ts`. Mong: FAIL, module chưa có.
- [ ] **Step 3: Cài** theo Interfaces. `LICENSE_PUBLIC_KEY_PEM` là một chuỗi giữ chỗ HIỂN NHIÊN KHÔNG HỢP LỆ (không phải PEM) cho tới Task 8, để chưa có gì xác minh được; KHÔNG tạo hay chép bất kỳ khóa riêng nào vào repo, kể cả khóa phát triển (test tự tạo khóa tại chỗ).
- [ ] **Step 4: Chạy** test và `npm run typecheck`. Mong: qua.
- [ ] **Step 5: Commit** `feat(license): giấy phép Ed25519 kiểm ngoại tuyến`.

### Task 2: Cổng giấy phép trong CLI điều khiển Zalo (phần A)

**Files:**
- Modify: `src/cli/bot-watch-core.ts`, `src/cli/bot-dispatch.ts`, `src/cli/bot-scrape.ts`
- Create: `src/core/licenseGate.ts`
- Test: `tests/licenseGate.test.ts`

**Interfaces:**
- Consumes: `checkLicense`, `LicenseResult` (Task 1).
- Produces:
  - `export function licenseGate(env: NodeJS.ProcessEnv, check: () => LicenseResult): { allow: true } | { allow: false; message: string; exitCode: 3 }`: `env.ZBOT_BUNDLED !== "1"` thì `allow: true` và KHÔNG gọi `check` (máy tác giả); ngược lại `ok` thì cho, `ok:false` thì `allow: false` kèm `message` tiếng Việt nêu lý do (mỗi `LicenseFailure` một câu riêng, câu `wrong-machine` và `missing` kèm hướng dẫn "gửi mã máy cho nhà cung cấp"; mã máy chỉ được in khi đọc được).
  - `export function requireLicense(): void`: gọi `licenseGate({ ZBOT_BUNDLED: process.env.ZBOT_BUNDLED }, () => checkLicense())` (đúng biểu thức chữ `process.env.ZBOT_BUNDLED`, để esbuild thay được), nếu `allow:false` thì `console.error(message)` rồi `process.exit(3)`.
  - Cờ "bản gộp" quyết ở LÚC DỰNG, không ở biến môi trường của khách: `build-dist.mjs` đặt esbuild `define: { "process.env.ZBOT_BUNDLED": "\"1\"" }`, nên mã trong `dist/` luôn coi là bản gộp dù khách chạy file Electron mà không đặt biến (nếu không, chạy `bao-cao-nhom.exe` với `ELECTRON_RUN_AS_NODE=1` và bỏ `ZBOT_BUNDLED` là bỏ qua phép kiểm). Chạy từ mã nguồn thì biến không đặt nên không bị chặn.
- Ba CLI gọi `requireLicense()` ở dòng đầu của `main` (trước khi lấy `scrape.lock`, trước khi chạm Zalo). `config-dump`, `export-excel`, `dispatch-status`, `watch-status-core` KHÔNG gọi.

- [ ] **Step 1: Viết test hỏng**: một test đọc `scripts/build-dist.mjs` khẳng định có `define` cho `process.env.ZBOT_BUNDLED`; không đặt `ZBOT_BUNDLED` thì `allow:true` và `check` không được gọi (đếm lần gọi); `ZBOT_BUNDLED=1` với `ok` cho `allow:true`; với từng `LicenseFailure` cho `allow:false`, `exitCode:3`, `message` khác nhau giữa năm lý do; quét `src/cli/` khẳng định `bot-watch-core.ts`, `bot-dispatch.ts`, `bot-scrape.ts` có `requireLicense()` và `config-dump.ts`, `export-excel.ts` không có.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài** `licenseGate.ts` và thêm lời gọi vào ba CLI.
- [ ] **Step 4: Chạy** `npm run typecheck`, `npm test`. Mong: qua.
- [ ] **Step 5: Commit** `feat(license): cổng giấy phép cho bot đã gộp`.

### Task 3: Lệnh trạng thái gộp được và lệnh cấp giấy phép (phần A)

**Files:**
- Create: `src/cli/dispatch-status.ts`, `src/cli/watch-status-core.ts`, `src/cli/license-info.ts`, `src/cli/issue-license.ts`, `tests/dispatchStatus.test.ts`, `tests/watchStatusCore.test.ts`, `tests/licenseInfo.test.ts`, `tests/issueLicense.test.ts`
- Modify: `scripts/build-dist.mjs` (thêm ba lệnh `dispatch-status`, `watch-status-core`, `license-info` vào danh sách điểm vào), `scripts/distCheck.mjs` (thêm kiểm điểm vào cấp giấy phép và khóa riêng)

**Interfaces:**
- `dispatch-status.ts`: đọc `readRunnerState()` và `runnerHealth()` từ `src/runner/runnerState.ts` (cùng file `data/.runner-state.json` mà `bot-dispatch` ghi) và hàng chờ từ `src/scrape/scrapeQueue.ts`; in dòng đầu theo ĐÚNG các cụm mà `panel/src/main/status-parse.ts` nhận: `[runner] ĐANG CHẠY (pid N) từ HH:MM`, `[runner] ĐÃ DỪNG lúc HH:MM`, `[runner] CÓ VẺ ĐÃ CHẾT: nhịp tim cuối lúc HH:MM (pid N)`, `[runner] LỖI (pid N)`, `[runner] chưa từng chạy`; sau đó một dòng `hàng chờ: <số> nhóm`. Hàm thuần `formatDispatchStatus(input: { state: RunnerState | null; queue: string[]; now: number }): string[]` để test được. Thoát mã 0 khi `alive`, 2 khi còn lại (như `runner:status`).
- `watch-status-core.ts`: `formatWatchStatusCore(input: { state: WatchState | null; now: number }): string[]` dùng `src/watch/watchState.ts` (đọc nó để biết trường), dòng đầu theo cụm của `[watch]` (`ĐANG CHẠY`, `ĐANG CHẠY NHƯNG MÙ`, `ĐÃ DỪNG`, `CÓ VẺ ĐÃ CHẾT`, `chưa từng chạy`); KHÔNG import `lesson/` (không có phân tích khoảng hở như `watch-status`).
- `license-info.ts` (gộp được, KHÔNG cổng giấy phép): in một dòng sau dấu `@@JSON@@` là `LicenseInfo` (kiểu định nghĩa ở Task 7: `{ state: "ok" | LicenseFailure; customer: string | null; expiresAt: string | null; machineId: string | null }`); hàm thuần `describeLicense(result: LicenseResult, machineId: string | null): LicenseInfo` để test được; `machineId` đọc lỗi thì `null`, không ném.
- `issue-license.ts` (chỉ tác giả, KHÔNG là điểm vào của `dist`): `npm run license:issue -- --customer "<tên>" --machine <MachineGuid> --days 90 --key <đường dẫn khóa riêng PEM> --out <file>`; hàm thuần `buildLicense(args, now, privateKeyPem): string` dùng `signLicense`; thiếu tham số thì thoát mã 1 với hướng dẫn; mặc định `--days 90`.
- `build-dist.mjs` thêm: (a) ghi `dist/package.json` chứa `{"type":"module"}` (bản cài không có `package.json` nào phía trên `dist/`, nên không có nó Node coi các `.js` là CommonJS và các CLI chết ngay; thử nghiệm `config-dump` ở Beta chỉ qua vì `package.json` gốc có `"type":"module"`); (b) esbuild `define` như ở Task 2; (c) `distCheck.mjs` thêm `export function staticExternalImports(outputText: string, externals: string[]): string[]` trả các gói trong `externals` (`mssql`, `msnodesqlv8`, `tesseract.js`) bị `import ... from "<gói>"` hay `import "<gói>"` ở mức cao nhất của file ra (máy khách không có `node_modules`); `import()` động được phép nhưng liệt kê trong báo cáo; build thất bại nếu có import tĩnh.
- `distCheck.mjs`: thêm `export function forbiddenEntries(entries: string[]): string[]` (trả mọi điểm vào có tên `issue-license`) và `export function containsPrivateKey(text: string): boolean` (`/-----BEGIN [A-Z ]*PRIVATE KEY-----/`); `build-dist.mjs` gọi cả hai trên danh sách điểm vào và trên nội dung các file ra, build thất bại nếu có.

- [ ] **Step 1: Viết test hỏng**: `formatDispatchStatus` cho từng trạng thái `RunnerState` (chạy, dừng, chết do nhịp tim cũ, lỗi, `null`), kiểm dòng đầu bằng đúng `parseStatus` của panel (import hàm đó vào test trong `tests/` bằng đường tương đối `../panel/src/main/status-parse.ts` và `../panel/src/shared/status.ts`; nếu import chéo không chạy được dưới `node:test`, chép các biểu thức chính quy vào test và ghi rõ nguồn); `formatWatchStatusCore` tương tự; `describeLicense` cho đủ năm trạng thái và `ok` mang `customer`, `expiresAt`; `buildLicense` ký được và `verifyLicense` chấp nhận kết quả với khóa công khai tương ứng; `forbiddenEntries(["bot-scrape","issue-license"])` trả `["issue-license"]`; `containsPrivateKey` bắt chuỗi PEM riêng và không bắt PEM công khai; `staticExternalImports` bắt `import x from "mssql"` và `import "tesseract.js"` và bỏ qua `await import("mssql")` và chữ `mssql` trong chuỗi thường; một test chạy `containsPrivateKey` trên nội dung mọi file mà `git ls-files` liệt kê (và trên các file trong `dist/` nếu có), để một subagent không thể commit nhầm file PEM riêng.
- [ ] **Step 2: Chạy** các test. Mong: FAIL.
- [ ] **Step 3: Cài** theo Interfaces; `package.json` script `license:issue` do agent chính thêm (chỉ ghi đề xuất vào báo cáo).
- [ ] **Step 4: Chạy** `npm run typecheck`, `npm test`, rồi `npm run build:dist`. Mong: qua; `dist/cli` có `dispatch-status.js`, `watch-status-core.js`, `license-info.js`, không có `issue-license.js`; `dist/package.json` có mặt.
- [ ] **Step 4b: Thử đúng như máy khách** (subagent được phép chạy chính file Electron ở chế độ Node thuần, không mở cửa sổ, chỉ cho bước này; `panel/node_modules/electron/dist/electron.exe`): chép `dist/` sang một thư mục NGOÀI repo và không có `node_modules` (thư mục tạm của scratchpad), tạo một `ZBOT_HOME` rỗng; đặt `ELECTRON_RUN_AS_NODE=1`, `ZBOT_CODE_ROOT`, `ZBOT_HOME`, KHÔNG đặt `ZBOT_BUNDLED`. Chạy `config-dump.js`, `dispatch-status.js`, `watch-status-core.js`, `license-info.js`: mỗi cái phải chạy ra đầu ra đúng (`@@JSON@@...` hay dòng `[runner]`/`[watch]`), không báo lỗi nạp module. Chạy `bot-watch-core.js`, `bot-dispatch.js`, `bot-scrape.js` với `ZBOT_HOME` rỗng (chưa có giấy phép): mỗi cái phải thoát mã 3 với thông báo thiếu giấy phép TRƯỚC khi chạm Zalo; nếu một cái KHÔNG thoát mã 3, dừng ngay (nó có thể điều khiển Zalo) và báo cáo.
- [ ] **Step 5: Commit** `feat(cli): lệnh trạng thái gộp được, lệnh cấp giấy phép, kiểm khóa riêng trong dist`.

### Task 4: Chế độ bản cài, lệnh chạy bằng Electron (phần B)

**Files:**
- Create: `panel/src/main/command.ts`, `panel/tests/command.test.ts`
- Modify: `panel/src/main/bots.ts`

**Interfaces:**
- Produces (`command.ts`; kiểu `Command`, `Mode` export từ file này):
  ```ts
  export interface Command { command: string; args: string[]; env: Record<string, string> }
  export interface Mode { bundled: boolean; resources: string; home: string; execPath: string }
  export function scriptCommand(script: string, mode: Mode): Command | null
  ```
  - `bundled` false: `{ command: "cmd.exe", args: ["/c","npm","run","-s",script], env: {} }` (hành vi hiện tại, không đổi).
  - `bundled` true: tra bảng `BUNDLED_ENTRIES: Record<string, string>` = `{ "bot:watch": "bot-watch-core", "bot:runner": "bot-dispatch", "bot:scrape": "bot-scrape", "config:dump": "config-dump", "export:excel": "export-excel", "watch:status": "watch-status-core", "runner:status": "dispatch-status", "license:info": "license-info" }`; có thì `{ command: mode.execPath, args: [join(mode.resources,"dist","cli", <tên>+".js")], env: { ELECTRON_RUN_AS_NODE: "1", ZBOT_BUNDLED: "1", ZBOT_HOME: mode.home, ZBOT_CODE_ROOT: mode.resources } }`; không có trong bảng thì `null` (script không thuộc bản bán: `bot:chat`, `bot:total`, `today`, `total:once`, `chat:status`, `total:status`).
  - Đường có khoảng trắng nằm trong MỘT phần tử của `args`.
- `bots.ts`: các chỗ gọi `cmd.exe /c npm ...` (`npmRun`, `start`, `runJob`, và `config-bridge` ở Task 6) đi qua `scriptCommand`; lệnh trả `null` thì kết quả là `{ ok: false, error: "not-in-bundle" }` (start) hoặc trạng thái `dead/unknown` kèm `text` "không có trong bản này" (status). `BotManager` nhận `mode: () => Mode`.
- `BUNDLED_BOT_IDS = ["watch", "runner"] as const` (để giao diện chỉ hiện hai bot này ở chế độ bản cài) khai báo trong `command.ts`; agent chính chuyển/tái xuất ở `panel/src/shared/bots.ts` khi gộp.

- [ ] **Step 1: Viết test hỏng** `panel/tests/command.test.ts`: `bundled` false cho đúng lệnh `cmd.exe /c npm run -s bot:watch`; `bundled` true với `resources = "C:\\Program Files\\Bao Cao Nhom\\resources"` cho `args` MỘT phần tử `...\\dist\\cli\\bot-watch-core.js` và `env` có đủ bốn khóa; `bot:chat` ở `bundled` true cho `null`; `runner:status` ở `bundled` true ánh xạ `dispatch-status`; `env.ZBOT_HOME` bằng `mode.home`.
- [ ] **Step 2: Chạy** `npm test` trong `panel/`. Mong: FAIL.
- [ ] **Step 3: Cài** `command.ts` và đổi `bots.ts` theo Interfaces; các test cũ của panel không đổi và phải qua.
- [ ] **Step 4: Chạy** `npm run lint`, `npm run typecheck`, `npm test` trong `panel/`. Mong: qua.
- [ ] **Step 5: Commit** `feat(panel): chạy CLI đã gộp bằng Electron, bảng lệnh của bản bán`.

### Task 5: Tìm "dự án" ở chế độ bản cài (phần B)

**Files:**
- Modify: `panel/src/main/project.ts`
- Test: `panel/tests/project.test.ts` (thêm test, không sửa cái có sẵn)

**Interfaces:**
- Hiện tại `ProjectStore` tìm thư mục có `package.json` và các script `REQUIRED_SCRIPTS`; ở chế độ bản cài không có thư mục như vậy. Thêm `export function bundledProject(resources: string, home: string): ProjectInfo` trả `{ dir: resources, missing: [], configReady: existsSync(join(resources,"dist","cli","config-dump.js")) }`, và `ProjectStore` nhận `mode` để trả `bundledProject(...)` thay cho việc tìm thư mục; `projectChoose` ở chế độ bản cài trả `null` (không có gì để chọn).

- [ ] **Step 1: Viết test hỏng**: `bundledProject` với thư mục tạm có `dist/cli/config-dump.js` cho `configReady: true`, thiếu file thì `false`; `missing` luôn rỗng; `ProjectStore` ở chế độ bản cài không hỏi chọn thư mục.
- [ ] **Step 2: Chạy** `npm test` trong `panel/`. Mong: FAIL.
- [ ] **Step 3: Cài** theo Interfaces.
- [ ] **Step 4: Chạy** `npm run lint`, `npm run typecheck`, `npm test` trong `panel/`. Mong: qua.
- [ ] **Step 5: Commit** `feat(panel): chế độ bản cài không cần thư mục dự án`.

### Task 6: Ghi `config.json` thật và xử lý `config.json` hỏng (phần B)

**Files:**
- Modify: `panel/src/main/config-bridge.ts`
- Create: `panel/src/main/config-json.ts`
- Test: `panel/tests/config-json.test.ts`, `panel/tests/config-bridge.test.ts`

**Interfaces:**
- `config-json.ts` (nằm ở `panel/src/main/`): `export function overlayToConfigJson(overlay: Record<string, unknown>): Record<string, unknown>` đổi đường dẫn phẳng ("vision.leave.groups": [...]) thành object lồng; `export function validateOverlay(overlay: Record<string, unknown>, dump: ConfigDump): string[]` trả danh sách lỗi (khóa không có trong `dump.settings`, kiểu khác kiểu của `value` hiện tại).
- `ConfigBridge` ở chế độ bản cài: `save(overlay)` chạy `validateOverlay`; có lỗi thì không ghi và trả `{ ok: false, errors }`. Không lỗi thì GỘP: đọc `config.json` hiện có (thiếu thì `{}`), áp `overlayToConfigJson(overlay)` lên nó (khóa overlay thay giá trị cũ; khóa có sẵn trong file mà overlay không nhắc tới, kể cả sửa tay hay khóa không phải đường dẫn của `config-dump`, GIỮ NGUYÊN; mảng và bảng tra thay nguyên khối), ghi vào file tạm rồi đổi tên (không để lại file nửa chừng), rồi chạy lại `config-dump` và trả `{ ok: true, file, warnings }` với `warnings` là các dòng `[config] ...` trên stderr của bot (dùng chính bộ kiểm của bot, không giữ bộ kiểm kiểu thứ hai trong panel; giao diện hiện các cảnh báo này). `load` ở chế độ bản cài làm phẳng `config.json` hiện có theo các đường dẫn của `dump.settings` để làm `overlay`. Khi `config-dump` thoát mã 1 vì `config.json` hỏng, `load` trả `{ ok: false, code: "failed", error }` với `error` là dòng lỗi của bot (đã gồm tên file), và giao diện hiện đúng dòng đó kèm nút "Mở thư mục cấu hình"; không trang trắng. Chế độ mã nguồn vẫn dùng `settings.draft.json` như cũ.

- [ ] **Step 1: Viết test hỏng**: `overlayToConfigJson({"vision.leave.groups":["g"],"cdpPort":9333})` cho `{vision:{leave:{groups:["g"]}},cdpPort:9333}`; `validateOverlay` với khóa lạ và với sai kiểu cho lỗi nêu đường dẫn khóa; `save` ở chế độ bản cài ghi file đọc lại bằng nhau (thư mục tạm), KHÔNG ghi khi có lỗi, và một khóa có sẵn trong `config.json` mà overlay không nhắc tới (vd `groupAliases` đặt tay) CÒN NGUYÊN sau khi lưu; `load` với `config-dump` giả trả lỗi cho `ok:false` mang dòng lỗi; chế độ mã nguồn vẫn ghi `settings.draft.json`.
- [ ] **Step 2: Chạy** `npm test` trong `panel/`. Mong: FAIL.
- [ ] **Step 3: Cài** theo Interfaces.
- [ ] **Step 4: Chạy** `npm run lint`, `npm run typecheck`, `npm test` trong `panel/`. Mong: qua.
- [ ] **Step 5: Commit** `feat(panel): ghi config.json lồng nhau ở chế độ bản cài, báo lỗi config hỏng`.

### Task 7: Trạng thái giấy phép trong panel (phần B, lớp main và preload)

**Files:**
- Create: `panel/src/main/license.ts`, `panel/tests/license.test.ts`
- (không sửa `shared/ipc.ts`, `preload/index.ts`, `ipc.ts`: subagent đề xuất đoạn mã trong báo cáo, agent chính áp dụng)

**Interfaces:**
- Produces (kiểu `LicenseInfo` export từ `panel/src/main/license.ts`; agent chính tái xuất ở `shared/ipc.ts`): `export interface LicenseInfo { state: "ok" | "missing" | "bad-format" | "bad-signature" | "wrong-machine" | "expired"; customer: string | null; expiresAt: string | null; machineId: string | null }`; kênh `licenseGet(): Promise<LicenseInfo>` và `licenseImport(sourcePath: string): Promise<LicenseInfo>`. Panel không có mã xác minh riêng: nó chạy CLI gộp `license-info` (Task 3) để lấy `LicenseInfo`, tránh sao chép phép kiểm vào hai nơi. `licenseImport` chép file người dùng chọn vào `join(home, "license.json")` (ghi qua file tạm), rồi gọi lại `licenseGet`.

- [ ] **Step 1: Viết test hỏng**: `licenseGet` ánh xạ đúng đầu ra giả của `license-info` (năm trạng thái); `licenseImport` chép file hợp lệ vào thư mục tạm và không ghi đè khi nguồn không đọc được.
- [ ] **Step 2: Chạy** các test. Mong: FAIL.
- [ ] **Step 3: Cài** theo Interfaces (phần lớp main và preload; màn hình do agent chính làm ở Task 8).
- [ ] **Step 4: Chạy** `npm run lint`, `npm run typecheck`, `npm test` trong `panel/` và `npm test` ở gốc. Mong: qua.
- [ ] **Step 5: Commit** `feat(panel): kênh trạng thái và nhập giấy phép`.

### Task 8: Màn hình, khóa thật, kiểm Electron (agent chính)

- [ ] **Step 1:** Tạo cặp khóa Ed25519 bằng `generateKeyPairSync`, cất khóa riêng ở thư mục NGOÀI hai repo (đề xuất `<thư mục khóa>\`), thêm mẫu `*.pem` và `*private*` vào `.gitignore` của Beta, thay `LICENSE_PUBLIC_KEY_PEM` bằng khóa công khai thật; xin người dùng xác nhận thư mục cất khóa trước khi tạo.
- [ ] **Step 2:** Sửa `panel/electron-builder.yml`: `appId: com.baocaonhom.app`, `productName: Báo Cáo Nhóm`, `executableName: bao-cao-nhom`, `extraResources` thêm `dist/` và các `.ps1` còn dùng; không đóng `src/`, `docs/`, `tests/`, `.claude/`, `data/`. `panel/src/main/index.ts`: dựng `Mode` từ `app.isPackaged`, `process.resourcesPath`, `join(process.env.LOCALAPPDATA, "BaoCaoNhom")`, `process.execPath`.
- [ ] **Step 3:** Giao diện (`panel/src/renderer/**`): ở chế độ bản cài chỉ hiện hai bot (`BUNDLED_BOT_IDS`) và ẩn trang tác vụ (`today`, `total:once` không có trong gói), các trang chat và báo cáo tổng, và các mục cài đặt của chúng (`chat`, `total`, `print`, `vision`, `reportSets` liên quan báo cáo của tổ chức khác nếu không dùng), cùng với thẻ trạng thái giấy phép (trạng thái, khách hàng, hạn, mã máy kèm nút sao chép) và nút "Nhập giấy phép"; hiện lỗi `config.json` hỏng như Task 6.
- [ ] **Step 4: Kiểm bằng Electron** với `ZBOT_HOME` trỏ vào một thư mục tạm rỗng, dùng cơ chế `PANEL_STEPS` hoặc skill `run`: (a) không có giấy phép thì thẻ báo thiếu và `Start` của bot báo từ chối; (b) cấp một giấy phép thử bằng `license:issue` cho `MachineGuid` của máy này, nhập qua nút, thẻ báo hợp lệ; (c) đặt `config.json` hỏng thì tab cấu hình hiện đúng dòng lỗi; (d) đường chạy có khoảng trắng. Không khởi động bot thật điều khiển Zalo trừ khi người dùng đồng ý.
- [ ] **Step 5: Commit** `feat(panel): giao diện giấy phép, đóng gói tên Báo Cáo Nhóm`.
