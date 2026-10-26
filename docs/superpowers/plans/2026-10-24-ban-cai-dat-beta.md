# Bản cài đặt Beta: tách lõi, cấu hình JSON, bộ điều phối mỏng, đóng gói chạy không cần Node

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Từ mã nguồn Beta dựng được một gói chạy trên máy Windows không có Node/npm: lõi cào Zalo tách khỏi nghiệp vụ, cấu hình đọc từ `config.json` ở thư mục ghi được, một bộ điều phối mỏng thay `bot:runner`, và panel gọi bản đã biên dịch.

**Architecture:** Giữ nguyên đối tượng `config` và 66 module import nó; `config.ts` đọc thêm `config.json` rồi ghi đè TẠI CHỖ lên giá trị mặc định (mặc định của mã bán ra là rỗng). `paths.ts` tách "thư mục mã" (chỉ đọc) khỏi "thư mục dữ liệu" (`ZBOT_HOME`). `watch.ts` không import `chat/` và `vision/`; hai phần đó vào qua một móc, bản của tác giả truyền vào, bản bán thì không. Các CLI gộp bằng esbuild thành `dist/cli/*.js`; nơi tự spawn tiến trình con (`runner/steps.ts`) chọn `dist/` hay `src/` theo chế độ.

**Tech Stack:** TypeScript, `node:test`, esbuild (phụ thuộc mới, cần người dùng đồng ý), Electron panel hiện có.

**Spec:** `docs/superpowers/specs/2026-10-24-ban-cai-dat-ban-cho-nguoi-khac-design.md` (mục "Thiết kế đề xuất"). Plan này KHÔNG làm: màn hình thiết lập lần đầu trong panel, giấy phép gắn máy, `electron-updater`. Ba thứ đó là plan sau (cuối tài liệu) vì cần quyết định chưa có (máy chủ giấy phép, kho cập nhật).

## Global Constraints

- Máy tác giả không đổi: `ZBOT_HOME` không đặt thì mọi đường dẫn giữ như hôm nay.
- Bản bán chỉ Windows; không Node/npm/tsx trên máy khách (spec, quyết định 1 và đóng gói mục 1).
- Cấu hình và dữ liệu ngoài thư mục cài; mỗi lần cập nhật thay cả thư mục cài (spec, "Điều làm việc này thất bại").
- Mặc định trong `config.ts` không chứa giá trị riêng của tác giả (nhóm, bộ báo cáo, đường dẫn) (spec).
- Import trong `src/` có đuôi `.js`; chú thích tiếng Việt như file lân cận (Rule 1).
- Tham số của tiến trình con truyền bằng mảng, không qua shell (đường cài có thể có khoảng trắng).
- Subagent KHÔNG chạy `bot:*`, `today`, `total:once`, `runner:once`, `fill:*`, `sync:db`, `zalo:debug`, mở Zalo hay Excel (Rule 4). Chỉ `npm run typecheck`, `npm test`.
- Phụ thuộc mới (esbuild) và thư mục mới `src/dispatch/` không có: cần người dùng đồng ý (Rule 1). Plan dùng `src/runner/` cho bộ điều phối vì bảng Rule 1 ghi "runner/: bot:runner: the cycle, the queue, runner state"; nếu người dùng muốn thư mục riêng thì đổi đường dẫn ở Task 5.
- Beta chưa có commit nào: Task 0 tạo commit nền. Lệnh commit chỉ chạy khi người dùng đã duyệt việc thực thi.

## Review Focus

1. `ZBOT_HOME` không đặt: đường dẫn y như bản hiện tại (Task 3 test). Sau khi gộp, `codeRoot` đến từ `ZBOT_CODE_ROOT`, không từ độ sâu thư mục (Task 3 test).
6. Dữ liệu riêng của tác giả không nằm trong commit nào, kể cả `config.example.json`, `chat-rules.json`, `photo-golden/` (Task 0 grep trước commit, Task 4).
7. `npm test` cho cùng kết quả ở máy có `config.json` và worktree không có (Task 4).
8. Gói `dist/` không chứa mã của `lesson/`, `master/`, `leave/`, `minutes/`, `vision/`, `total/`, `reportSets/`, `chat/` (Task 6 `forbiddenInputs`).
2. `config.json` lỗi cú pháp hoặc có BOM: bot từ chối chạy và nêu tên file, không âm thầm chạy với mặc định rỗng (Task 4).
3. `config.json` chứa khóa lạ hoặc sai kiểu: cảnh báo nêu khóa, giữ giá trị mặc định, bot vẫn chạy (Task 4).
4. Đường cài có khoảng trắng (`C:\Users\A B\AppData\...`): lệnh spawn là mảng, không ghép chuỗi (Task 6).
5. Thư mục lõi (`scrape/`, `store/`, `core/`, `export/`, `mcp/`, `watch/`) không import `lesson/`, `vision/`, `chat/`: có test quét mã nguồn giữ ranh giới (Task 1 cho `scrape/`, `store/`, `core/`, `export/`, `mcp/`; Task 2 thêm `watch/`).

## Phân việc (Rule 4)

- **Phần A, lõi** (Task 1, 2): subagent A. Sở hữu: `src/core/foldText.ts`, `src/core/vnTime.ts`, `src/lesson/foldText.ts`, `src/lesson/time.ts`, dòng import trong `src/scrape/*.ts`, `src/watch/**`, `src/cli/bot-watch.ts`, `src/cli/bot-watch-core.ts`, `tests/coreBoundary.test.ts`, `tests/watchExtensions.test.ts`.
- **Phần B, điều phối và đóng gói** (Task 5, 6): subagent B, bắt đầu SAU khi agent chính xong Task 3 và 4 (cần `paths.ts`). Sở hữu: `src/runner/dispatch.ts`, `src/cli/bot-dispatch.ts`, `scripts/build-dist.mjs`, `src/runner/steps.ts`, `tests/dispatch.test.ts`, `tests/cliCommand.test.ts`.
- **Agent chính** (Task 0, 3, 4, 7): `src/core/paths.ts`, `config.ts`, `src/config/*`, `package.json`, `panel/**`, `CLAUDE.md`, `README.md`.
- Phần A chạy song song với plan `2026-10-24-bao-cao-dinh-nghia-lat-1.md`. Thứ tự gộp: A, rồi Task 3 và 4, rồi B, rồi Task 7. Sau gộp: `npm run typecheck` và `npm test` trên nhánh đã gộp, và trong `panel/` chạy `npm run lint` và `npm test` nếu đã sửa.
- Mỗi subagent nhận đường dẫn `<repo>\.claude\RULES\` và đọc Rule 1 trước (nội dung dán vào prompt vì worktree không có thư mục này nếu chưa commit).

---

### Task 0: Làm sạch dữ liệu riêng rồi commit nền cho Beta (agent chính)

Mọi thứ đã commit nằm trong lịch sử vĩnh viễn, nên dữ liệu riêng của tác giả phải ra khỏi cây TRƯỚC commit đầu.

- [ ] **Step 1: Tìm.** Lấy các tên nhóm trong `config.targets` và tên người trong `reportSets` (`reporterName`) của `config.ts`; `grep -rIl` từng tên trong toàn bộ cây Beta (trừ `node_modules`). Nơi đã biết có dữ liệu thật: `config.ts`, `chat-rules.json` (tên nhóm, tên người được gắn thẻ), `photo-golden/leave.json` (tên nhân viên trong ảnh nghỉ phép), `.claude/skills/*/references/`, `docs/`, `tests/` (tin mẫu có tên trường, tên người). Liệt kê kết quả cho người dùng.
- [ ] **Step 2: Làm sạch.** `config.ts`: đưa `targets`, `reportSets`, `vision.leave.groups`, `vision.leave.senders` về rỗng (Task 4 hoàn tất phần đọc `config.json`). `chat-rules.json`: thay tên nhóm và tên người thật bằng chỗ giữ chỗ. `photo-golden/leave.json`: thay bằng tập rỗng (`{"sourceDir":"","cases":[]}`) và thêm `/photo-golden/*.json` vào `.gitignore` kèm một file `.example`. Tên trong `tests/`, `docs/`, `.claude/` và tin mẫu: người dùng quyết từng nơi (giữ, thay giả, hay đưa vào `.gitignore`); không tự ý sửa test mà không báo.
- [ ] **Step 3:** `git status --short`, rồi kiểm lại bằng `grep` cùng các tên ở Step 1: không còn trong file sẽ commit. Kiểm `.env` không có trong danh sách (đã `.gitignore`).
- [ ] **Step 4:** `npm run typecheck` và `npm test`; ghi lại số hỏng mới so với 1 hỏng đã biết (`formatConfig shows the scroll delay...`) và 13 bỏ qua; test hỏng vì dữ liệu đã làm sạch thì sửa bằng cách truyền đối tượng vào mã, không khôi phục giá trị riêng.
- [ ] **Step 5: Commit** `chore: nền Beta, sao từ zca-scrape-message ngày 2026-10-24, đã bỏ dữ liệu riêng`.

### Task 1: Đưa hai hàm dùng chung vào `core/` và giữ ranh giới

**Files:**
- Create: `src/core/foldText.ts`, `src/core/vnTime.ts`, `tests/coreBoundary.test.ts`
- Modify: `src/lesson/foldText.ts` (còn `export * from "../core/foldText.js"`), `src/lesson/time.ts` (import và re-export các hàm đã chuyển), các dòng import trong `src/scrape/*.ts`

**Interfaces:**
- Produces: `src/core/foldText.ts` xuất lại đúng các tên mà `lesson/foldText.ts` xuất hôm nay (`fold`, `stripDiacritics`); `src/core/vnTime.ts` xuất `vietnamDay(ts: number): string`, `todayVietnam(now?: number): string`, `vietnamHourMinute(ts: number): { hour: number; minute: number }`, `hhmmVietnam(ts: number): string` (nguyên văn từ `lesson/time.ts`, không phụ thuộc `config`).
- `lesson/time.ts` vẫn xuất các tên đó (qua re-export) nên không file nào khác phải đổi import.

- [ ] **Step 1: Viết test hỏng** `tests/coreBoundary.test.ts`: quét đệ quy mọi `.ts` trong `src/scrape`, `src/store`, `src/core`, `src/export`, `src/mcp`; khẳng định không dòng import nào trỏ vào `../lesson/`, `../vision/`, `../chat/`, `../master/`, `../leave/`, `../minutes/`, `../runner/`, `../total/`, `../reportSets/` (regex trên dòng `from "..."`; `config.js` ở gốc được phép).
- [ ] **Step 2: Chạy** `node --import tsx --test tests/coreBoundary.test.ts`. Mong: FAIL, hai dòng import trong `src/scrape/` (`lesson/parseReport.js`, `lesson/time.js`) được nêu tên.
- [ ] **Step 3: Chuyển mã** như ở Interfaces; sửa import trong `src/scrape/` sang `../core/...`.
- [ ] **Step 4: Chạy** `npm run typecheck` và `npm test`. Mong: qua (cùng 1 test hỏng đã biết, không thêm hỏng).
- [ ] **Step 5: Commit** `refactor(core): đưa fold và giờ Việt Nam vào core, giữ lõi không import nghiệp vụ`.

### Task 2: Móc mở rộng của `watch`

**Files:**
- Create: `src/watch/extensions.ts`, `src/watch/eventRouting.ts`, `src/chat/watchExtensions.ts` (bản của tác giả, nằm NGOÀI `src/watch/` để ranh giới của thư mục `watch/` sạch), `src/cli/bot-watch-core.ts`, `tests/watchExtensions.test.ts`
- Modify: `src/watch/watch.ts` (bỏ import `chat/`, `vision/`; nhận `ext`), `src/cli/bot-watch.ts` (truyền `authorExtensions()`)

**Interfaces:**
- Produces (`extensions.ts`):
  ```ts
  export interface WatchExtensions {
      /** Gọi cho mỗi tin trước khi xếp hàng; trả { queue:false } để không xếp (vd tin dội lại của bot chat, nhóm chỉ-chat). Mặc định: xếp khi biết nhóm. */
      onEvent?(event: RealtimeMessageEvent, target: string | undefined): { queue: boolean };
  }
  ```
- Produces (`eventRouting.ts`): `export function handleRealtimeEvent(args: { event: RealtimeMessageEvent; target: string | undefined; ext: WatchExtensions; enqueue(target: string, tag: string): void }): void` (gọi `ext.onEvent`; ném lỗi của móc thì bắt, ghi cảnh báo và vẫn xếp hàng như `routeMessageSafe` hôm nay; `target` rỗng thì không xếp).
- Produces (`src/chat/watchExtensions.ts`): `export function authorExtensions(): WatchExtensions` chứa phần hiện ở `watch.ts` dòng 100–128: `makeChatGroupsReader`, `routeMessageSafe`, `appendInbox`, `consumeEcho`, và tải ảnh nhóm đọc ảnh (`visionGroups`, `downloadImageFromUrl`).
- `watch(ext: WatchExtensions = {}): Promise<void>`.

- [ ] **Step 1: Viết test hỏng** `tests/watchExtensions.test.ts`: (a) `handleRealtimeEvent` không có `ext.onEvent` và có `target` thì gọi `enqueue(target, "realtime-ws")` một lần; (b) `onEvent` trả `{queue:false}` thì không gọi `enqueue`; (c) `onEvent` ném lỗi thì vẫn gọi `enqueue`; (d) `target` là `undefined` thì không gọi `enqueue`; (e) quét MỌI `.ts` trong `src/watch/` không có import `../chat/`, `../vision/`, `../lesson/`, `../master/`, `../leave/`, `../minutes/`, `../runner/`, `../total/`, `../reportSets/`; và mở rộng `tests/coreBoundary.test.ts` (Task 1) để quét cả `src/watch/` bằng cùng danh sách cấm.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài** các file như ở Interfaces; `bot-watch.ts` gọi `watch(authorExtensions())`; `bot-watch-core.ts` gọi `watch()`.
- [ ] **Step 4: Chạy** `npm run typecheck` và `npm test` (gồm `tests/coreBoundary.test.ts`). Mong: qua; các test chat/fanout cũ không đổi.
- [ ] **Step 5: Commit** `refactor(watch): chat và đọc ảnh vào qua móc, lõi watch không import chúng`.

### Task 3: Thư mục mã và thư mục dữ liệu (agent chính)

**Files:**
- Modify: `src/core/paths.ts`
- Test: `tests/paths.test.ts`

**Interfaces:**
- `import.meta.url` chỉ được dùng ở `src/core/paths.ts` (hiện còn `config.ts` dùng để tính `repoRoot`; hai nơi duy nhất, đã grep). Sau khi gộp thành `dist/cli/x.js`, đường tính từ `import.meta.url` trỏ vào `dist/cli`, nên `codeRoot` KHÔNG suy ra từ độ sâu thư mục: `paths.ts` đọc `process.env.ZBOT_CODE_ROOT` (panel đặt) và chỉ khi không có mới suy ra từ `import.meta.url`. `config.ts` bỏ phép tính riêng, import `repoRoot`/`appHome` từ `paths.ts` (`paths.ts` không import `config.ts`, nên không vòng).
- Produces: `export function resolveAppPaths(codeRoot: string, home: string | undefined): { codeRoot: string; home: string; srcDir: string; distDir: string; scriptsDir: string; outputDir: string; chatRulesPath: string; photoRulesDir: string; templatesDir: string }`: `home` là `home ?? codeRoot`; `outputDir`, `chatRulesPath` nằm dưới `home`; `srcDir`, `distDir`, `scriptsDir`, `photoRulesDir` nằm dưới `codeRoot`; `templatesDir` = `<home>/templates` khi `home` được đặt, còn không giữ `path.resolve(codeRoot, "..", "templates")` như hôm nay. Các hằng đang xuất (`repoRoot`, `srcDir`, `outputDir`, `scriptsDir`, `templatesDir`, `chatRulesPath`, `photoRulesDir`) lấy từ `resolveAppPaths(repoRoot, process.env.ZBOT_HOME)`; thêm `export const appHome` và `export const distDir`.

- [ ] **Step 1: Viết test hỏng**: `home` không đặt cho mọi đường dẫn bằng giá trị hôm nay (so với công thức cũ viết thẳng trong test); `home` đặt thì `outputDir`, `chatRulesPath`, `templatesDir` nằm dưới `home` còn `scriptsDir`, `photoRulesDir`, `srcDir`, `distDir` vẫn dưới `codeRoot`; quét `src/` và `config.ts`: chỉ `src/core/paths.ts` chứa `import.meta.url`.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài** theo Interfaces.
- [ ] **Step 4: Chạy** `npm run typecheck` và `npm test`. Mong: qua.
- [ ] **Step 5: Commit** `feat(paths): tách thư mục mã và thư mục dữ liệu bằng ZBOT_HOME`.

### Task 4: Cấu hình đọc từ `config.json` (agent chính)

**Files:**
- Create: `src/config/configFile.ts`, `config.example.json` (CHỈ chỗ giữ chỗ như `"Tên nhóm Zalo 1"`, `"Tên người phụ trách"`, không giá trị thật nào), `tests/configFile.test.ts`
- Modify: `config.ts` (mặc định rỗng cho `targets`, `reportSets`, `vision.leave.groups`, đường dẫn riêng; `dataDir` và `statusExportDir` mặc định dưới `appHome`; gọi nạp ở cuối), `.gitignore` (thêm `/config.json`), `src/config/configDoc.ts` và `src/config/configCheck.ts` nếu một khóa cần ghi chú về giá trị rỗng mới, `tests/configDoc.test.ts` (test đang hỏng cần giá trị `targets = bot test`: cho nó dùng đối tượng cấu hình dựng trong test, không dựa vào `config.ts` thật)
- Giá trị thật của tác giả (nhóm, bộ "NguoiA", `dataDir`) chỉ nằm trong `config.json` cục bộ không commit, dùng cho việc kiểm tay ở máy tác giả.
- `npm test` KHÔNG đọc `config.json`: `config.ts` bỏ qua file khi `process.env.NODE_TEST_CONTEXT` có giá trị (Node đặt biến này cho các file chạy dưới `--test`; một test khẳng định biến đó có mặt trong lúc test chạy, để biết khi nó đổi), trừ khi `ZBOT_CONFIG_IN_TESTS=1`. Nhờ đó kết quả test giống nhau ở máy có `config.json` và worktree không có. Test hỏng thêm vì mặc định rỗng thì sửa bằng cách truyền đối tượng cấu hình vào mã, không khôi phục giá trị riêng.

**Interfaces:**
- Produces:
  - `export interface ConfigLoad { applied: string[]; warnings: string[] }`
  - `export function applyConfigOverrides(target: Record<string, unknown>, overrides: unknown): ConfigLoad`: duyệt `overrides`; khóa không có trong `target` thì thêm cảnh báo nêu đường dẫn khóa; kiểu khác kiểu của giá trị mặc định (mảng/số/chuỗi/bool/object) thì cảnh báo và giữ mặc định; mảng được THAY (không nối); object gộp đệ quy; khóa là getter (chỉ đọc) thì cảnh báo và bỏ; gán TẠI CHỖ để getter còn nguyên.
  - `export function readConfigFile(file: string): { ok: true; value: unknown } | { ok: false; message: string }` (không có file thì `{ ok: true, value: {} }`; bỏ BOM; lỗi cú pháp thì `{ ok:false }` kèm tên file và vị trí lỗi).
  - `export const configFilePath = (): string => path.join(appHome, "config.json")` (từ `paths.ts`).
- `config.ts`: sau khi dựng đối tượng, `readConfigFile` rồi `applyConfigOverrides`; `ok:false` thì in lỗi và `process.exit(1)`; cảnh báo in qua `console.warn("[config] ...")` như `validateConfig` hôm nay. `validateConfig` chạy SAU khi ghi đè.

- [ ] **Step 1: Viết test hỏng** `tests/configFile.test.ts`: ghi đè một khóa số và một khóa lồng nhau; mảng `targets` được thay; khóa lạ cho cảnh báo nêu `"vision.nope"`; sai kiểu (`cdpPort: "9222"`) cho cảnh báo và giữ `9222`; getter (`cdpUrl`) không bị ghi đè và có cảnh báo; file thiếu cho `{}`; file có BOM đọc được; file cú pháp lỗi cho `ok:false` với thông báo chứa tên file; `config.example.json` đọc được và mọi khóa của nó áp dụng không cảnh báo lên một bản sao của `config` thật.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài** theo Interfaces; `config.example.json` chỉ chứa chỗ giữ chỗ cho các khóa `targets`, `reportSets`, `vision.leave.groups`, `dataDir`, `statusExportDir`; trong `config.ts` đặt các khóa đó rỗng/đường dẫn dưới `appHome`.
- [ ] **Step 4: Chạy** `npm run typecheck`, `npm test`, rồi `npm run config:show` và `npm run config:dump` (chỉ đọc). Mong: qua; `config:dump` vẫn in JSON sau dấu `@@JSON@@`; `tests/configDoc.test.ts` qua.
- [ ] **Step 5: Commit** `feat(config): đọc config.json, mặc định không chứa giá trị riêng`.

### Task 5: Bộ điều phối mỏng

**Files:**
- Create: `src/runner/dispatch.ts`, `src/cli/bot-dispatch.ts`, `tests/dispatch.test.ts`

**Interfaces:**
- Consumes: `takeSnapshot`, `completeSnapshot`, `importLegacyQueue` (`src/scrape/scrapeQueue.ts`); `runQueuedScrape`, `QueueRunDeps` (`src/scrape/queueRun.ts`); `runScrape` (`src/scrape/desktopScraper.ts`); `acquireScrapeLock`, `releaseScrapeLock` (`src/core/scrapeLock.ts`); `decide`, `QUIET_MS`, `MAX_WAIT_MS` (`src/runner/schedule.ts`).
- Produces:
  - `export interface DispatchDeps { queue: QueueRunDeps; afterScrape?(targets: string[]): Promise<void>; log(message: string): void }`
  - `export async function runDispatchCycle(deps: DispatchDeps): Promise<{ status: "idle" | "done" | "failed"; failed: string[] }>`: gọi `runQueuedScrape(deps.queue)`; `empty` trả `idle` và không gọi `afterScrape`; sau cào thành công gọi `afterScrape(targets đã cào)` (lỗi của nó ghi log, không đổi trạng thái cào); có nhóm cào lỗi thì `failed`.
- `bot-dispatch.ts`: vòng lặp dùng `decide` như `bot:runner` (hàng chờ yên `QUIET_MS` thì chạy, tối đa `MAX_WAIT_MS` kể từ nhóm đầu), giữ `scrape.lock` trong lúc chạy. Hàm `afterScrape` của lát này để trống: móc cho bộ máy báo cáo ở plan sau. Bộ điều phối GHI TRẠNG THÁI bằng `startRunner`, `beatRunner`, `recordCycle`, `stopRunner` của `src/runner/runnerState.ts` (cùng file `data/.runner-state.json`), để lệnh `runner-status` hiện có và panel đọc được nó thay vì thấy "không rõ" (dựa vào `runner:status` hiện nay đọc đúng file này; đọc `src/cli/runner-status.ts` và `src/runner/runnerStatusReport.ts` để chắc chắn các trường nó cần, và điền đủ).

- [ ] **Step 1: Viết test hỏng** `tests/dispatch.test.ts` với `QueueRunDeps` giả: hàng chờ rỗng cho `idle` và `afterScrape` không được gọi; có nhóm cào được cho `done` và `afterScrape` nhận đúng danh sách nhóm; `scrape` ném lỗi thì `runDispatchCycle` ném tiếp (không đánh dấu hàng chờ, như `runQueuedScrape`); `afterScrape` ném lỗi thì kết quả vẫn `done` và có một dòng log lỗi; có nhóm lỗi thì `failed` chứa nhóm đó.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài** `runDispatchCycle` và `bot-dispatch.ts` (vòng lặp mô phỏng phần chờ của `src/cli/bot-runner.ts`; đọc file đó trước, không sao chép phần dựng báo cáo, sync DB, đọc ảnh).
- [ ] **Step 4: Chạy** `npm run typecheck` và `npm test`. Mong: qua. Không chạy `bot-dispatch` (nó điều khiển Zalo).
- [ ] **Step 5: Commit** `feat(runner): bộ điều phối mỏng, cào hàng chờ rồi gọi móc báo cáo`.

### Task 6: Gộp thành `dist/` và chọn lệnh theo chế độ

**Files:**
- Create: `scripts/build-dist.mjs`, `tests/cliCommand.test.ts`
- Modify: `src/runner/steps.ts` (dòng spawn quanh `src/runner/steps.ts:32`), `package.json` (agent chính: script `build:dist`, devDependency `esbuild`)

**Interfaces:**
- Produces (`src/runner/steps.ts`): `export function cliCommand(script: string, bundled: boolean): { command: string; args: string[] }`: `bundled` false cho `{ command: process.execPath, args: ["--import", "tsx", path.join(srcDir, "cli", script)] }` (đúng như hôm nay); `bundled` true cho `{ command: process.execPath, args: [path.join(distDir, "cli", script.replace(/\.ts$/, ".js"))] }`. Chế độ gộp được biết qua `process.env.ZBOT_BUNDLED === "1"`, do panel đặt.
- Produces (`scripts/build-dist.mjs`): gộp các điểm vào `src/cli/bot-watch-core.ts`, `bot-dispatch.ts`, `bot-scrape.ts`, `export-excel.ts`, và các lệnh trạng thái panel gọi: `config-dump.ts`, `watch-status.ts`, `runner-status.ts` (và `src/mcp/server.ts` thành `dist/mcp/server.js`) thành `dist/cli/<tên>.js` (ESM, platform `node`, target `node22`, `minify: true`, không sourcemap), đánh dấu `external` các gói có phần gốc hoặc nhị phân mà esbuild không gộp được (kiểm bằng cách chạy build; danh sách `external` ghi vào đầu script kèm lý do). Chạy esbuild với `metafile: true` và gọi `forbiddenInputs(metafile)`; có đầu vào nào thì build thất bại.
- Produces (cùng file, hoặc `scripts/distCheck.mjs`): `export function forbiddenInputs(metafile: { inputs: Record<string, unknown> }): string[]`: trả các đường vào thuộc `src/lesson/`, `src/master/`, `src/leave/`, `src/minutes/`, `src/vision/`, `src/ocr/`, `src/total/`, `src/reportSets/`, `src/chat/`. Hiện `src/config/configCheck.ts` import `lesson/schoolArea.js`; nếu kiểm này bắt được nó (và qua nó thêm `registry.ts` cùng các layout), đưa phần cần dùng (`parseGroupName` và bảng khu vực) sang một file không thuộc `lesson/` hoặc đưa phép kiểm ra khỏi bản gộp; không nới danh sách cấm để build qua. Danh sách này sẽ nới đúng một cách, có chủ đích, khi bộ máy báo cáo của plan sau được gộp vào.

- [ ] **Step 1: Viết test hỏng** `tests/cliCommand.test.ts`: `cliCommand("bot-scrape.ts", false).args` bằng `["--import","tsx", <srcDir>/cli/bot-scrape.ts]`; `cliCommand("bot-scrape.ts", true).args` bằng `[<distDir>/cli/bot-scrape.js]`; một `script` có khoảng trắng trong `distDir` (dựng `distDir` giả bằng hàm nhận `root`) vẫn là MỘT phần tử của mảng; `forbiddenInputs({inputs:{"src/lesson/time.ts":{}, "src/scrape/cdp.ts":{}}})` trả đúng `["src/lesson/time.ts"]` và `{inputs:{}}` trả `[]`.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài `cliCommand`** và đổi dòng spawn của `steps.ts` dùng nó.
- [ ] **Step 4: Viết `build-dist.mjs`**; agent chính thêm `esbuild` và script `build:dist` vào `package.json` SAU khi người dùng đồng ý phụ thuộc.
- [ ] **Step 5: Chạy** `npm run typecheck` và `npm test`; rồi `npm run build:dist`. Mong: tạo `dist/cli/*.js`; `node dist/cli/bot-scrape.js --help` hoặc tương đương không báo thiếu module khi khởi động mà chưa điều khiển Zalo (nếu chương trình không có chế độ thử, chỉ kiểm bằng `node --check`).
- [ ] **Step 6: Commit** `feat(build): gộp CLI lõi thành dist, chọn lệnh theo chế độ`.

### Task 7: Panel gọi bản đã gộp (agent chính)

**Files:**
- Modify: `panel/src/main/bots.ts`, `panel/src/main/config-bridge.ts`, `panel/electron-builder.yml`
- Test: các test của `panel/tests/` đang có cho `bots.ts`/`config-bridge.ts` (đọc trước khi sửa), thêm test cho lệnh dựng

**Interfaces:**
- Consumes: `cliCommand` (Task 6, ý tưởng: panel dựng cùng dạng lệnh bằng `node.exe` kèm theo trong resources); biến `ZBOT_HOME` và `ZBOT_BUNDLED=1` panel đặt cho mọi tiến trình con.
- Produces: trong `panel/src/main/bots.ts`, hàm `botCommand(script: string, bundled: boolean, resources: string): { command: string; args: string[] }` thay `cmd.exe /c npm run -s <script>`; panel đặt cho mọi tiến trình con `ZBOT_HOME` = `path.join(process.env.LOCALAPPDATA, "<tên sản phẩm>")` (KHÔNG dùng `app.getPath("userData")`: đó là `%APPDATA%` Roaming, dữ liệu cào không được đi theo hồ sơ người dùng; spec nói `%LOCALAPPDATA%`), `ZBOT_CODE_ROOT` = thư mục `resources` đã cài, `ZBOT_BUNDLED=1`.
- `panel/src/main/config-bridge.ts` hiện lưu bản nháp vào `settings.draft.json` mà không bot nào đọc: đổi thành ghi `config.json` ở `ZBOT_HOME` (qua hàm kiểm tra của `src/config/configFile.ts` trước khi ghi, lỗi thì không ghi), và đọc giá trị hiện tại từ `config-dump`.

- [ ] **Step 1: Đọc** `panel/src/main/bots.ts`, `config-bridge.ts` và test của chúng; liệt kê mọi chỗ gọi `npm`.
- [ ] **Step 2: Viết test hỏng** cho `botCommand` trong `panel/tests/`: `bundled` true cho đường `node.exe` trong `resources` và `dist/cli/<tên>.js` làm MỘT phần tử mảng dù đường có khoảng trắng; false giữ `npm` như hôm nay (chạy từ mã nguồn).
- [ ] **Step 3: Chạy** `npm test` trong `panel/`. Mong: FAIL.
- [ ] **Step 4: Cài** `botCommand`, dùng nó ở mọi nơi gọi `npm`, đổi `config-bridge.ts` như ở Interfaces (thêm test cho đường ghi: dữ liệu sai kiểu bị từ chối, file `config.json` ra đúng chỗ), và sửa `electron-builder.yml`: `extraResources` thêm `dist`, `scripts` (chỉ các `.ps1` còn dùng), và `node.exe`. Không đóng `src/`, `docs/`, `tests/`, `.claude/`, `data/`.
- [ ] **Step 5: Chạy** `npm run lint` và `npm test` trong `panel/`. Mong: qua. Dựng bản cài (`electron-builder`) là bước tay của người dùng, không chạy ở đây.
- [ ] **Step 6: Commit** `feat(panel): gọi bản đã gộp, đặt ZBOT_HOME`.

---

## Các plan sau (chưa viết)

- **Thiết lập lần đầu trong panel**: kiểm Zalo Desktop và Excel có trên máy, dò đường dẫn Zalo, nhập nhóm, chọn thư mục dữ liệu; ghi `config.json`.
- **Giấy phép gắn máy**: cần quyết định cơ chế và máy chủ kiểm tra.
- **Cập nhật tự động** (`electron-updater`): cần kho chứa bản cập nhật; bản vá khẩn cần dừng bot an toàn (chờ `data/.scrape.lock`).
- **Nối bộ máy báo cáo** (plan `bao-cao-dinh-nghia-lat-*`) vào `afterScrape` của bộ điều phối.
- **Đồng bộ sửa lỗi giữa Beta và bản gốc**: Beta là bản sao rời, nên một bản sửa `scrapeSelectors.ts` ở một bên phải được chép sang bên kia; cần người dùng chọn cách (cherry-pick, hay Beta thành nhánh của cùng repo).
