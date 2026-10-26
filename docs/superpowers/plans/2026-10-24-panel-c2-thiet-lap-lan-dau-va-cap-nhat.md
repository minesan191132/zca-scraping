# Panel C2: thiết lập lần đầu và cập nhật tự động

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Máy khách mới cài mở panel thấy các bước dẫn đường (giấy phép, kiểm Zalo Desktop và Excel, khai nhóm, thư mục xuất) và sau đó nhận bản cập nhật mà không bị cài khi bot đang chạy.

**Architecture:** Phần logic thuần nằm ở `panel/src/main/setup.ts` và `panel/src/main/updater.ts` (test được bằng Vitest, không cần Electron); giao diện Svelte nằm ở `panel/src/renderer/**` do agent chính làm và tự kiểm bằng Electron. Cấu hình ghi qua `ConfigBridge.save` của plan C1; giấy phép qua kênh `licenseGet/licenseImport` của plan C1. Cập nhật dùng `electron-updater` với GitHub Releases ở một repo riêng, công khai, chỉ chứa bản phát hành (spec, "Quyết định sản phẩm do advisor đưa").

**Tech Stack:** TypeScript, Svelte 5, Vitest, Electron, `electron-updater` (phụ thuộc mới, cần người dùng đồng ý).

**Spec:** `docs/superpowers/specs/2026-10-24-ban-cai-dat-ban-cho-nguoi-khac-design.md`. **Phụ thuộc:** plan `2026-10-24-panel-c1-chay-ban-gop-va-giay-phep.md` phải xong trước (chế độ bản cài, `scriptCommand`, `ConfigBridge.save`, `licenseGet/licenseImport`).

## Global Constraints

- Tên và id: "Báo Cáo Nhóm", `com.baocaonhom.app`, `bao-cao-nhom`, `%LOCALAPPDATA%\BaoCaoNhom` (spec).
- Bản mới cài ở lần mở panel kế tiếp, KHÔNG bao giờ trong lúc bot do panel khởi động đang chạy hay `data/.scrape.lock` đang giữ (spec, quyết định 4).
- Tải bản cập nhật không cần token; repo phát hành công khai, chỉ có file cài và `latest.yml`, không mã nguồn, không chữ "Zalo" trong tên repo và mô tả (spec).
- Kế hoạch KHÔNG tự tạo hay đẩy repo phát hành, không đẩy bản phát hành: việc đó do người dùng làm hoặc xác nhận trước (outward-facing).
- Bản cài không ký số: không đặt `publisherName`; phải kiểm `electron-updater` chạy được trong tình huống đó (Task 5).
- Tên nhóm Zalo phải trùng đúng chữ ở thanh bên Zalo (`config.targets`); panel không đọc được thanh bên, nên chỉ kiểm cú pháp và trùng lặp và nhắc người dùng.
- Máy cần Excel có bản quyền (spec, F): panel báo rõ khi thiếu, không chặn các bước khác.
- Chú thích tiếng Việt, theo quy ước của `panel/` (eslint, vitest, import `@shared/*`) (Rule 1).
- Subagent KHÔNG chạy Electron (`npm run dev`, `build:*`), không chạy bot, không mở Zalo/Excel; chỉ `npm run lint`, `npm run typecheck`, `npm test` trong `panel/` (Rule 4). Agent chính tự kiểm Electron.
- Lệnh commit chỉ chạy khi người dùng đã duyệt việc thực thi.

## Review Focus

1. Excel có hay không dò đúng, kể cả khi Excel cài kiểu Click-to-Run hay chỉ có bản dùng thử; máy không có Excel thì báo rõ, không chặn (Task 1).
2. Danh sách nhóm: rỗng, trùng, có khoảng trắng thừa, có ký tự điều khiển; lưu xong bot đọc đúng (Task 2).
3. Cập nhật tải xong khi bot đang chạy: không cài cho tới khi bot dừng và panel khởi động lại (Task 4).
4. Mất mạng hoặc kho phát hành không có bản mới: panel vẫn mở bình thường, không báo lỗi gây hoang mang (Task 4).
5. Bản cài không ký vẫn nhận được bản mới (Task 5 kiểm tay).
6. Đóng panel giữa bước thiết lập: lần mở sau tiếp tục ở bước dở, không mất những gì đã lưu (Task 3).

## Phân việc (Rule 4)

Worktree tạo bằng `git worktree add` ở `<thư mục cha>\wt-<tên>` (xem plan C1, mục Phân việc), nối `node_modules` bằng junction.

- **Subagent:** Task 1 đến 4 (logic thuần). Sở hữu: `panel/src/main/setup.ts`, `panel/src/main/updater.ts`, `panel/src/shared/setup.ts` (file mới), `panel/tests/setup.test.ts`, `panel/tests/updater.test.ts`.
- **Agent chính:** `panel/package.json` (`electron-updater`), `panel/electron-builder.yml` (khối `publish`), `panel/src/main/index.ts` và `ipc.ts` (nối), `panel/src/renderer/**`, Task 3 (màn hình), Task 5 (kiểm Electron và cập nhật), `CLAUDE.md`, `README.md`.
- Gộp: subagent trước, rồi agent chính. Sau gộp: `npm run lint`, `npm run typecheck`, `npm test` trong `panel/`.
- Plan này đi qua advisor trước khi giao subagent (Rule 2).

---

### Task 1: Dò môi trường (Zalo Desktop, Excel)

**Files:**
- Create: `panel/src/main/setup.ts`
- Test: `panel/tests/setup.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Environment { zaloExe: string | null; excelInstalled: boolean }
  export function pickZaloExe(programsDir: string, list: (dir: string) => string[], exists: (file: string) => boolean): string | null
  export function parseExcelProbe(regOutput: string): boolean
  export function detectEnvironment(): Promise<Environment> // dùng pickZaloExe với %LOCALAPPDATA%\Programs\Zalo, và `reg query HKCR\Excel.Application\CLSID` qua execFile (mảng tham số, không shell)
  ```
- `pickZaloExe`: trong `programsDir` chọn thư mục `Zalo-<số phiên bản>` có số phiên bản lớn nhất (so theo từng đoạn số, không theo chữ: `Zalo-9.0` nhỏ hơn `Zalo-10.1`) và có `Zalo.exe`; không có thì `null`. Cách chọn khác với `findZaloExe` của bot (nó sắp theo chữ); đây là chủ ý, ghi vào chú thích.
- `parseExcelProbe`: `true` khi đầu ra chứa một dòng `(Default)` có GUID; còn lại `false`.

- [ ] **Step 1: Viết test hỏng**: `pickZaloExe` với danh sách `["Zalo-9.0.1","Zalo-10.1.0","readme"]` chọn `Zalo-10.1.0` nếu có `Zalo.exe`, và rơi về `Zalo-9.0.1` khi `Zalo-10.1.0` thiếu `Zalo.exe`; danh sách rỗng cho `null`; `parseExcelProbe` với đầu ra mẫu có GUID cho `true`, với chuỗi lỗi "ERROR: The system was unable to find..." và chuỗi rỗng cho `false`.
- [ ] **Step 2: Chạy** `npm test` trong `panel/`. Mong: FAIL.
- [ ] **Step 3: Cài** theo Interfaces.
- [ ] **Step 4: Chạy** `npm run lint`, `npm run typecheck`, `npm test`. Mong: qua.
- [ ] **Step 5: Commit** `feat(panel): dò Zalo Desktop và Excel cho bước thiết lập`.

### Task 2: Kiểm danh sách nhóm và thư mục xuất

**Files:**
- Create: `panel/src/shared/setup.ts`
- Test: `panel/tests/setup.test.ts` (thêm)

**Interfaces:**
- Produces:
  ```ts
  export function normalizeTargets(input: string[]): { targets: string[]; errors: string[] }
  export function validateExportDir(dir: string): string | null // null = hợp lệ; lỗi nếu rỗng, không phải đường dẫn tuyệt đối Windows, hay nằm trong thư mục cài
  ```
- `normalizeTargets`: cắt khoảng trắng hai đầu, bỏ dòng rỗng, bỏ ký tự điều khiển, bỏ trùng (so không phân biệt hoa thường, giữ lần đầu) và ghi `errors` cho từng thay đổi ("bỏ trùng: …"); danh sách rỗng cho `errors` có một mục "chưa có nhóm nào". Không đổi chữ hoa thường hay dấu của tên (Zalo phân biệt).
- `validateExportDir`: tuyệt đối (`/^[A-Za-z]:\\/`), không rỗng, không chứa `\Program Files\` hay thư mục cài đặt của panel (tham số `resources` truyền vào nếu cần; chữ ký thêm `installDir?: string`).

- [ ] **Step 1: Viết test hỏng**: `[" A ","a","","B\u0007"]` cho `targets: ["A","B"]` và hai lỗi (trùng, ký tự điều khiển); danh sách rỗng cho lỗi "chưa có nhóm nào"; tên có dấu giữ nguyên (`"LC_BìnhMinh_BTAN"`); `validateExportDir("")`, `("relative\\x")`, `("C:\\Program Files\\App\\out")` cho lỗi; `("D:\\BaoCao")` cho `null`.
- [ ] **Step 2: Chạy** `npm test` trong `panel/`. Mong: FAIL.
- [ ] **Step 3: Cài** theo Interfaces.
- [ ] **Step 4: Chạy** `npm run lint`, `npm run typecheck`, `npm test`. Mong: qua.
- [ ] **Step 5: Commit** `feat(panel): kiểm danh sách nhóm và thư mục xuất`.

### Task 3: Thứ tự các bước thiết lập, và màn hình (logic: subagent; màn hình: agent chính)

**Files:**
- Modify: `panel/src/shared/setup.ts`, `panel/tests/setup.test.ts` (logic, subagent)
- Create/Modify: `panel/src/renderer/**` (màn hình, agent chính)

**Interfaces:**
- Produces (logic):
  ```ts
  export type SetupStep = "license" | "environment" | "groups" | "output" | "done";
  export interface SetupInput { licenseOk: boolean; env: Environment; targets: string[]; statusExportDir: string | null }
  export function nextSetupStep(input: SetupInput): SetupStep
  export function setupProblems(input: SetupInput): string[] // cảnh báo không chặn, vd "Không tìm thấy Excel: báo cáo Excel sẽ không dựng được"
  ```
- Thứ tự: `license` (chưa có giấy phép hợp lệ) → `environment` (hiện kết quả dò; KHÔNG chặn nếu thiếu Excel, chỉ chặn khi thiếu Zalo Desktop vì không có thứ để cào) → `groups` (`targets` rỗng) → `output` (`statusExportDir` null hoặc không hợp lệ) → `done`. Quay lại bước trước vẫn được; `nextSetupStep` chỉ cho bước dở đầu tiên.
- Khi `env.zaloExe` tìm được (Task 1), bước `environment` ghi `zaloExePath` vào `config.json` qua `ConfigBridge.save`, để bot dùng đúng file Zalo.exe mà màn hình thiết lập hiện, vì cách chọn bản của panel (so số phiên bản) khác `findZaloExe` của bot (so chữ). Có thể thêm một test cho hàm thuần `setupConfigPatch(env): Record<string, unknown>` trả `{ zaloExePath: <đường> }` hoặc `{}` khi không có.
- Màn hình: trạng thái bước lấy từ `nextSetupStep` mỗi lần mở (không lưu "đã tới bước mấy" riêng), nên đóng giữa chừng thì mở lại tiếp tục đúng chỗ.

- [ ] **Step 1: Viết test hỏng** (logic): đủ giấy phép, thiếu Zalo thì `environment`; thiếu Excel mà có Zalo thì đi tiếp tới `groups` và `setupProblems` có cảnh báo Excel; `targets` rỗng cho `groups`; `statusExportDir` null cho `output`; đủ cả cho `done`; thiếu giấy phép luôn là `license` dù các thứ khác đủ.
- [ ] **Step 2: Chạy** `npm test` trong `panel/`. Mong: FAIL.
- [ ] **Step 3: Cài** logic. Màn hình do agent chính làm sau khi gộp: bốn bước, bước `groups` có ô nhập nhiều dòng và nhắc "tên đúng như hiện ở thanh bên Zalo", bước `output` có nút chọn thư mục, bước cuối hiện nút "Bắt đầu theo dõi" (khởi động bot `watch` và `runner` bằng `startBot`, chỉ khi người dùng bấm).
- [ ] **Step 4: Chạy** `npm run lint`, `npm run typecheck`, `npm test`. Mong: qua. Màn hình: agent chính kiểm bằng Electron với `ZBOT_HOME` trỏ vào thư mục tạm rỗng (đủ các ca: không giấy phép, không Zalo, không Excel, đóng giữa chừng rồi mở lại).
- [ ] **Step 5: Commit** `feat(panel): thứ tự và màn hình thiết lập lần đầu`.

### Task 4: Quy tắc cập nhật an toàn

**Files:**
- Create: `panel/src/main/updater.ts`
- Test: `panel/tests/updater.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface InstallGuard { botsRunning: boolean; jobRunning: boolean; scrapeLockHeld: boolean }
  export function canInstallNow(g: InstallGuard): boolean // chỉ true khi cả ba đều false
  export type UpdateEvent = { kind: "none" } | { kind: "downloaded"; version: string } | { kind: "error"; message: string }
  export function describeUpdate(e: UpdateEvent): { text: string; severity: "info" | "quiet" }
  ```
- `describeUpdate`: `none` và `error` đều là `severity: "quiet"` (mất mạng không làm hoang mang), `downloaded` là `info` với chữ "Có bản mới <version>, sẽ cài ở lần mở sau".
- Một cách kích hoạt duy nhất: CÀI Ở LẦN MỞ PANEL KẾ TIẾP (khớp spec). `autoUpdater.autoDownload = true`, `autoInstallOnAppQuit = false`; lúc panel khởi động, TRƯỚC khi khởi động bot nào, nếu đã có bản tải xong và `canInstallNow` thì gọi `quitAndInstall()`. Không cài lúc thoát (thoát đã dừng các bot panel khởi động, nhưng bản cài còn thay file `bao-cao-nhom.exe` mà chính các bot đã gộp chạy bằng, nên cài lúc có bot mồ côi là hỏng).
- `InstallGuard` được cấp từ lệnh trạng thái (một trong hai bot `watch`/`runner` đang `alive` hoặc `warn` thì `botsRunning` là true, kể cả bot do một phiên panel trước đã khởi động rồi mồ côi, mà `BotManager.hasOwned()` không thấy), từ cờ job, và từ sự có mặt của `data/.scrape.lock`. `checkForUpdates()` lúc khởi động và mỗi 6 giờ, lỗi mạng chỉ ghi nhật ký.

- [ ] **Step 1: Viết test hỏng**: `canInstallNow` cho tám tổ hợp của ba cờ (chỉ tổ hợp toàn `false` là `true`); `describeUpdate` cho ba loại sự kiện (mất mạng là `quiet`).
- [ ] **Step 2: Chạy** `npm test` trong `panel/`. Mong: FAIL.
- [ ] **Step 3: Cài** theo Interfaces.
- [ ] **Step 4: Chạy** `npm run lint`, `npm run typecheck`, `npm test`. Mong: qua.
- [ ] **Step 5: Commit** `feat(panel): quy tắc cài cập nhật an toàn`.

### Task 5: Nối `electron-updater`, kiểm cập nhật không ký (agent chính, cần người dùng)

- [ ] **Step 1: Xin người dùng ba thứ trước khi làm:** đồng ý thêm `electron-updater` (phụ thuộc mới), `owner` và `repo` của repo phát hành công khai (người dùng tạo, hoặc xác nhận để tôi gợi ý tên trung tính không có chữ "Zalo"), và xác nhận KHÔNG đẩy gì lên GitHub trong plan này.
- [ ] **Step 2:** Thêm `electron-updater` vào `panel/package.json`; `panel/electron-builder.yml` thêm `publish: [{ provider: github, owner: <owner>, repo: <repo> }]` (không đặt `publisherName`); `panel/src/main/updater.ts` nối `autoUpdater` theo mục "Phần nối" của Task 4 và gọi `canInstallNow` với kết quả lệnh trạng thái (hai bot), cờ job, và sự có mặt của `data/.scrape.lock`; sự kiện đẩy ra giao diện bằng một kênh mới và hiện một dòng nhỏ ở thanh trên.
- [ ] **Step 3: Kiểm không cần GitHub:** dựng hai bản cài (phiên bản 0.1.0 và 0.1.1) bằng `npm run build:win`, đặt vào một thư mục tạm cùng `latest.yml`, phục vụ bằng một server `node:http` ngắn trong scratchpad, và chạy panel 0.1.0 với `provider: generic` trỏ vào `http://127.0.0.1:<cổng>` qua tệp `dev-app-update.yml` hay biến môi trường (xem tài liệu `electron-updater`). Khẳng định: (a) không ký mà vẫn tải và nhận ra 0.1.1; (b) khi có bot đang chạy, không cài, kể cả bot mồ côi do phiên panel trước khởi động (khởi động bot, thoát panel bằng cách bỏ qua bước dừng bot nếu có, mở lại panel); và ghi lại điều bộ cài NSIS làm với một tiến trình `bao-cao-nhom.exe` đang chạy ở chế độ Node (bị buộc đóng, hay báo file đang dùng) để biết ca xấu nhất; (c) tắt server giữa chừng thì panel mở bình thường, chỉ ghi nhật ký. Nếu `electron-updater` từ chối bản không ký, DỪNG và báo người dùng: phải chọn ký số hoặc phương án cập nhật khác.
- [ ] **Step 4: Báo kết quả** cho người dùng, kèm việc còn lại họ phải làm tay (tạo repo, phát hành bản đầu, cất khóa).
- [ ] **Step 5: Commit** `feat(panel): cập nhật tự động qua GitHub Releases, cài lúc không có bot chạy`.
