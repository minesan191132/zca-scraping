# Báo cáo định nghĩa bằng dữ liệu, lát 1: bộ máy và 4 báo cáo kỹ thuật

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một bộ máy đọc "định nghĩa báo cáo" (file JSON) và dựng đúng cùng dữ liệu điền Excel như mã hiện tại; 4 báo cáo kỹ thuật (`attendanceStart`, `attendanceEnd`, `shiftStart`, `shiftEnd`) chạy qua bộ máy này.

**Architecture:** Bộ đổi giá trị của `techReport.ts` tách thành `converters.ts`; một định nghĩa JSON mô tả tiêu đề, nhãn, cột, bộ đổi giá trị, khung giờ, mẫu; bộ máy sinh `rows`, `headerCells`, `formulaCells` rồi đưa vào lớp điền Excel hiện có (`runFillReplacingSameDay`, `fill-status-template.ps1`), không đổi. Phép thử chính: bộ máy và mã cũ sinh CÙNG dữ liệu cho cùng tin mẫu, chạy trong `npm test`, không cần Excel.

**Tech Stack:** TypeScript, `node:test`, không thêm phụ thuộc.

**Spec:** `docs/superpowers/specs/2026-10-24-bao-cao-dinh-nghia-bang-du-lieu-design.md` (mục A, tầng 1 và 2; bậc 1 của bảng 15 mã). Lát này KHÔNG làm: đổi `ReportKey` thành chuỗi (mục C), mẫu có dấu thay thế (mục B), khung giờ tổng quát (mục D), giao diện (mục E), báo cáo `cleaning` và bậc 2. Chúng là các plan sau (cuối tài liệu).

## Global Constraints

- Import trong `src/` có đuôi `.js`; đặt tên và mật độ chú thích theo file đang sửa, chú thích viết bằng tiếng Việt như các file lân cận (Rule 1).
- Đường dẫn lấy từ `src/core/paths.ts`; file chạy ghi qua `core/atomicWrite.ts`, chỉ vào `data/` hoặc `output/`.
- Không thêm phụ thuộc. Không đổi `ps1`, `FileLayout`, `FileFillSpec`.
- Hành vi 4 báo cáo kỹ thuật không đổi: tên file, trạng thái `data/.<code>.<set>.json`, chữ ký dòng, quy tắc khung giờ (tin sau mốc bị bỏ, phút mốc còn lấy).
- Subagent KHÔNG chạy `fill:*`, `bot:*`, `today`, `total:once`, `runner:once`, `sync:db`, hay mở Excel/Zalo (Rule 4). Chỉ `npm run typecheck`, `npm test`.
- Thư mục mới `src/definitions/` (và `src/definitions/builtin/`) chưa có trong bảng Rule 1: cần người dùng đồng ý trước Task 1.
- Lệnh commit chỉ chạy khi người dùng đã duyệt việc thực thi.

## Review Focus

1. Tin đúng tiêu đề nhưng thiếu "Tên Trường": hôm nay bị bỏ lặng lẽ; phải vào file "cần xem" (Task 4, Task 7).
2. Một file định nghĩa hỏng (cột trùng, mốc giờ sai, JSON lỗi, có BOM) không làm các định nghĩa khác ngừng nạp (Task 2, Task 6).
3. Nhãn gõ sai ("Tên Truog", "Tình trạng Netsuppot") vẫn vào đúng cột như mã cũ (Task 5, tin mẫu có lỗi chính tả).
4. File định nghĩa của khách trùng mã với bản dựng sẵn: bản dựng sẵn thắng và có cảnh báo (Task 6).
5. Không có tin nào: bảng trắng một dòng như `techRowsForFill` hôm nay (Task 4, Task 5).

## Phân việc (Rule 4)

Một subagent, một worktree (`isolation: "worktree"`), làm tuần tự Task 1 đến 6; Task 7 và 8 do agent chính làm vì chạm file dùng chung. Lát này không song song được bên trong vì các task dùng chung `src/definitions/`. Nó song song được VỚI plan `2026-10-24-ban-cai-dat-beta.md` (Task 1, 2 của plan đó chạm `lesson/foldText.ts`, `lesson/time.ts`, `src/watch/`, `src/scrape/`; lát này chỉ chạm `lesson/techReport.ts` và `src/definitions/`).

- Subagent sở hữu: `src/definitions/**`, `tests/definition*.test.ts`, `src/lesson/techReport.ts` (chỉ đổi import và xóa hàm đã chuyển).
- Chỉ agent chính sửa: `config.ts`, `src/config/configDoc.ts`, `src/config/configCheck.ts`, `src/types/index.ts`, `src/reportSets/registry.ts`, `package.json`, `CLAUDE.md`, `README.md`, `src/cli/fill-tech-reports.ts` (Task 7).
- Subagent đọc `<repo>\.claude\RULES\1-system-structure.md` trước; worktree không có `.claude/RULES` nếu chưa commit, nên dán nội dung vào prompt.
- Sau gộp: `npm run typecheck` và `npm test` trên nhánh đã gộp.

---

### Task 1: Bộ đổi giá trị dùng chung

**Files:**
- Create: `src/definitions/converters.ts`
- Modify: `src/lesson/techReport.ts` (dùng `convert`, xóa các hàm cục bộ `text`, `numberOrText`, `bulletList`, `roomNumbers`, `leadingNumber`, `clockCell`; `parseClockFraction` CHUYỂN sang `converters.ts` và `techReport.ts` xuất lại nó bằng `export { parseClockFraction } from "../definitions/converters.js"`, để `converters.ts` không import ngược `techReport.ts`; giữ export `parseCutoff`)
- Test: `tests/definitionConverters.test.ts`

**Interfaces:**
- Produces: `export function parseClockFraction(text: string): number | null` (nguyên văn từ `techReport.ts`, các test cũ vẫn import nó từ `techReport.js`); và:
  - `export const CONVERTER_NAMES = ["text","numberOrText","bulletList","bulletListSkipNone","roomNumbers","leadingNumber","clock","clockOrSentTime","speedMbps","itLevel"] as const;`
  - `export type ConverterName = (typeof CONVERTER_NAMES)[number];`
  - `export interface ConvertContext { ts: number }`
  - `export function convert(name: ConverterName, raw: string | undefined, ctx: ConvertContext): Cell` (`raw === undefined` nghĩa là tin không có dòng nhãn đó; mọi bộ coi nó như chuỗi rỗng, riêng `speedMbps` trả null khi `undefined` còn có nhãn thì gọi `parseSpeedText(raw)` như `parseTechRow` hôm nay.)

- [ ] **Step 1: Viết test hỏng** `tests/definitionConverters.test.ts`, mỗi dòng một khẳng định, giá trị lấy từ hành vi hiện tại của `parseTechRow`:
  `convert("numberOrText","51 máy",c) === 51`; `("numberOrText","0",c) === 0`; `("numberOrText","",c) === null`; `("numberOrText","tốt",c) === "tốt"`; `("bulletListSkipNone","Văn Long, Minh Tuấn",c) === "- Văn Long\n- Minh Tuấn"`; `("bulletListSkipNone","0",c) === null`; `("bulletList","1 Media tốt, 1 sumikura yếu",c) === "- 1 Media tốt\n- 1 sumikura yếu"`; `("roomNumbers","PM2",c) === 2`; `("roomNumbers","PM2, PM3, PM4",c) === "2, 3, 4"`; `("leadingNumber","1 hoạt động",c) === 1`; `("clock","9g30",c) === 570/1440`; `("clock","",c) === null`; `("clockOrSentTime","",{ts}) ` bằng phần ngày của giờ Việt Nam của `ts` (chọn `ts` cho 08:15 giờ Việt Nam, mong `(8*60+15)/1440`); `("speedMbps",undefined,c) === null`; `("speedMbps","90 mbps",c)` bằng `parseSpeedText("90 mbps")`; `("itLevel","l",c) === itLevelValue("l")`.
- [ ] **Step 2: Chạy** `node --import tsx --test tests/definitionConverters.test.ts`. Mong: FAIL, module chưa có.
- [ ] **Step 3: Cài `convert`** trong `src/definitions/converters.ts`, chuyển nguyên thân các hàm từ `techReport.ts` (không viết lại luật); `clockOrSentTime` là `parseClockFraction(raw) ?? (hour*60+minute)/1440` theo `vietnamHourMinute(ctx.ts)`.
- [ ] **Step 4: Sửa `techReport.ts`** để `parseTechRow` gọi `convert`; không đổi kết quả.
- [ ] **Step 5: Chạy** `npm run typecheck` rồi `npm test`. Mong: qua, kể cả `tests/techReport.test.ts` và `tests/techReportRows.test.ts` cũ (không sửa chúng).
- [ ] **Step 6: Commit** `refactor(definitions): tách bộ đổi giá trị của báo cáo kỹ thuật`.

### Task 2: Kiểu định nghĩa và kiểm tra

**Files:**
- Create: `src/definitions/types.ts`, `src/definitions/validate.ts`
- Test: `tests/definitionValidate.test.ts`

**Interfaces:**
- Consumes: `ConverterName`, `CONVERTER_NAMES` (Task 1); `TITLE_KEYS` từ `src/lesson/spelling.ts`; `parseCutoff` từ `src/config/clockTime.ts`.
- Produces (`types.ts`):
  ```ts
  export type TitleScope = keyof typeof TITLE_KEYS;
  export type LabelScope = "attendance" | "shiftStart" | "shiftEnd";
  export interface ColumnRule { column: string; labels: string[]; convert: ConverterName }
  export interface ReportDefinition {
      code: string; label: string;
      titles: string[]; titleScope?: TitleScope; labelScope?: LabelScope;
      requiredLabels: string[]; sttColumn: string; columns: ColumnRule[]; continuationLabel?: string;
      window: { cutoff: string };
      template: { file: string; sheet: string; firstDataRow: number; totalRowBefore: number; lastColumn: string; deleteSheets?: string[]; copyFirstRowFormat?: boolean };
      header: { dateCell: string; reporterCell?: string; reporterPrefix?: string };
      total: { column: string };
  }
  ```
- Produces (`validate.ts`): `export function validateDefinition(raw: unknown): { ok: true; def: ReportDefinition } | { ok: false; errors: string[] }`. Mọi lỗi được gom, không ném.

- [ ] **Step 1: Viết test hỏng**, một `test()` cho mỗi luật: định nghĩa đúng (`shiftStart` rút gọn) cho `ok: true`; mã không khớp `/^[A-Za-z][A-Za-z0-9]*$/`; cột không khớp `/^[A-Z]{1,2}$/`; hai cột cùng chữ; `convert` ngoài `CONVERTER_NAMES`; `window.cutoff` "25:99" (dùng `parseCutoff`); `titles` rỗng và không có `titleScope`; `totalRowBefore <= firstDataRow`; `requiredLabels` rỗng; đầu vào không phải object. Mỗi trường hợp khẳng định `ok === false` và một chuỗi lỗi chứa tên trường sai.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài `validateDefinition`** như trên.
- [ ] **Step 4: Chạy** test, rồi `npm run typecheck`. Mong: qua.
- [ ] **Step 5: Commit** `feat(definitions): kiểu và kiểm tra định nghĩa báo cáo`.

### Task 3: Nhận tin và đọc một dòng

**Files:**
- Create: `src/definitions/engine.ts`
- Test: `tests/definitionEngine.test.ts`

**Interfaces:**
- Consumes: `ReportDefinition` (Task 2), `convert` (Task 1); `titleKey`, `labelKey`, `canonicalAttendanceLabel`, `canonicalShiftStartLabel`, `canonicalShiftEndLabel`, `TITLE_KEYS` từ `src/lesson/spelling.ts`; `splitLabel` từ `src/lesson/parseReport.ts`.
- Produces:
  - `export type MatchKind = "match" | "near" | null;`
  - `export function classifyByDefinition(def: ReportDefinition, content: string): MatchKind`: `"match"` khi dòng đầu khớp tiêu đề (`titleKey` thuộc `TITLE_KEYS[def.titleScope]` hoặc thuộc `def.titles.map(titleKey)`) VÀ mọi `requiredLabels` có mặt VỚI GIÁ TRỊ KHÔNG RỖNG (khớp `parseTechRow` hôm nay, bỏ tin có dòng `- Tên Trường:` để trống); `"near"` khi khớp tiêu đề nhưng thiếu hoặc rỗng một nhãn bắt buộc; `null` còn lại.
  - `export function parseRowByDefinition(def: ReportDefinition, content: string, ts: number): Record<string, Cell> | null` (null trừ khi `"match"`; chưa có cột STT).
  - `export function missingLabels(def: ReportDefinition, content: string): string[]`; `export function unknownLabels(def: ReportDefinition, content: string): string[]` (nhãn có trong tin mà không cột nào và không `requiredLabels` dùng).
- Cách đọc nhãn: giống `readLabels` của `techReport.ts` (dòng lặp nhãn lấy dòng cuối; `continuationLabel` nhận thêm các dòng sau không có dấu hai chấm). Khóa nhãn của tin = bộ chuẩn hóa theo `labelScope` (`attendance`→`canonicalAttendanceLabel`, v.v.; không có `labelScope` thì `labelKey`). Cột khớp khi khóa thuộc `column.labels.map(labelKey)`.

- [ ] **Step 1: Viết test hỏng** với một định nghĩa tự viết trong test (không dùng file builtin): tin đủ nhãn cho `"match"` và đúng giá trị ô; tin thiếu "Tên Trường" cho `"near"` và `missingLabels` = `["ten truong"]`; tiêu đề lạ cho `null`; nhãn lặp lấy dòng cuối; `continuationLabel` nối các dòng sau; nhãn lạ nằm trong `unknownLabels`; tiêu đề có dấu ngoặc kép bao ngoài (`"CÔNG VIỆC CUỐI CA LÀM`) vẫn khớp.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài** ba hàm; không sao chép bảng chính tả, chỉ gọi hàm có sẵn.
- [ ] **Step 4: Chạy** test và `npm run typecheck`. Mong: qua.
- [ ] **Step 5: Commit** `feat(definitions): nhận tin và đọc dòng theo định nghĩa`.

### Task 4: Dòng theo khung giờ, mục cần xem, dữ liệu điền

**Files:**
- Modify: `src/definitions/engine.ts`
- Create: `src/definitions/fillParts.ts`
- Test: `tests/definitionRows.test.ts`

**Interfaces:**
- Consumes: Task 3; `SourceMessage`, `Cell` từ `src/types/index.ts`; `vietnamDay`, `vietnamHourMinute` từ `src/lesson/time.ts`; `parseCutoff`; `excelDateSerialForDay`, `FileLayout`, `HeaderCell`, `FormulaCell` từ `src/lesson/statusReportLayout.ts`.
- Produces:
  - `export interface ReviewItem { code: string; msgId: string; ts: number; reason: "thieu-nhan"; missing: string[] }`
  - `export function rowsInWindow(def: ReportDefinition, messages: SourceMessage[], day: string): { rows: Array<Record<string, Cell>>; review: ReviewItem[] }`: chỉ tin `msgType === "desktop.text"`, gửi trong `day` (giờ Việt Nam) đến hết phút `parseCutoff(def.window.cutoff)`; `"match"` thành dòng (cột STT từ 1, xếp theo `ts` rồi `msgId`); `"near"` thành `ReviewItem` (cũng chỉ trong khung giờ).
  - `export function buildFillParts(def: ReportDefinition, rows: Array<Record<string, Cell>>, day: string, reporter?: string): { layout: FileLayout; rows: Array<Record<string, Cell>>; headerCells: HeaderCell[]; formulaCells: FormulaCell[] }` (`rows` rỗng thì `[{ A: null }]`; `formulaCells` là `COUNTA(<total.column><first>:<total.column><last>)` đặt ở `<total.column><last+1>` với `last = first + max(rows,1) - 1`; `headerCells` có `dateCell` = `excelDateSerialForDay(day)` định dạng `dd/mm/yyyy`, và ô `reporterCell` = `reporterPrefix + reporter` khi có `reporter`; `layout.deleteSheets` và `copyFirstRowFormat` lấy từ `template`).

- [ ] **Step 1: Viết test hỏng**: tin sau mốc 08:30 bị bỏ, tin lúc 08:30 còn; tin ngày khác bị bỏ; thứ tự theo `ts`; tin thiếu "Tên Trường" cho đúng một `ReviewItem` với `missing` và không thành dòng; không có tin cho `rows` rỗng và `buildFillParts` ra `[{A:null}]`; công thức với 0 dòng là `COUNTA(C4:C4)` ở `C5`, với 3 dòng là `COUNTA(C4:C6)` ở `C7`; có `reporter` thì có ô `A2`.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài** hai hàm.
- [ ] **Step 4: Chạy** test và `npm run typecheck`. Mong: qua.
- [ ] **Step 5: Commit** `feat(definitions): dòng theo khung giờ và dữ liệu điền Excel`.

### Task 5: 4 định nghĩa dựng sẵn và phép thử tương đương

**Files:**
- Create: `src/definitions/builtin/attendanceStart.ts`, `attendanceEnd.ts`, `shiftStart.ts`, `shiftEnd.ts` (mỗi file `export const <mã>: ReportDefinition = {...}`; viết bằng TypeScript chứ không phải JSON để esbuild gộp được vào `dist/` mà không cần sao chép file và không phải bật `resolveJsonModule`), và `src/definitions/builtin/index.ts` xuất `export const BUILTIN_DEFINITIONS: ReportDefinition[]`
- Test: `tests/definitionTechGolden.test.ts`

**Interfaces:**
- Consumes: Task 2 đến 4; mã cũ `techRowsInWindow`, `TECH_LAYOUT`, `techHeaderCells`, `techFormulaCells`, `techRowsForFill` (không sửa).
- Produces: bốn đối tượng hợp lệ theo `validateDefinition` (test gọi nó trên từng cái). Chung: `sttColumn "A"`, `requiredLabels ["ten truong"]`, `template.file "05 - FORM EXCEL BAO CAO KY THUAT.xlsx"`, `firstDataRow 4`, `totalRowBefore 8`, `copyFirstRowFormat true`, `deleteSheets` = ba sheet kia (`ĐẦU BUỔI`, `CUỐI BUỔI`, `ĐẦU CA`, `CUỐI CA`), `total.column "C"`, `header.reporterCell "A2"`, `reporterPrefix "Nhân viên báo cáo: "`, cột `B itLevel ["cap"]`, `C text ["ten truong"]`, `D text ["phan hieu"]`, `E text ["phuong xa"]`.
  - `attendanceStart` (`titleScope "attendanceStart"`, `labelScope "attendance"`, sheet `ĐẦU BUỔI`, `lastColumn "J"`, `dateCell "J2"`, cutoff `08:30`) và `attendanceEnd` (`titleScope "attendanceEnd"`, sheet `CUỐI BUỔI`, cutoff `12:30`, còn lại như trên): `F clockOrSentTime ["thoi gian"]`, `G numberOrText ["tong so it"]`, `H text ["ten it ctv"]`, `I bulletListSkipNone ["thuc tap it"]`, `J numberOrText ["nhan vien vang"]`.
  - `shiftStart` (`titleScope "shiftStart"`, `labelScope "shiftStart"`, sheet `ĐẦU CA`, `lastColumn "K"`, `dateCell "K2"`, cutoff `09:00`, `continuationLabel "cong viec thuc hien"`): `F text ["truong nhom it"]`, `G clock ["bat dau gio lam"]`, `H roomNumbers ["phong may truong"]`, `I roomNumbers ["phong may cong ty"]`, `J roomNumbers ["phong may lam viec"]`, `K text ["cong viec thuc hien"]`.
  - `shiftEnd` (`titleScope "shiftEnd"`, `labelScope "shiftEnd"`, sheet `CUỐI CA`, `lastColumn "U"`, `dateCell "U2"`, cutoff `12:00`): `F text ["truong nhom it"]`, `G clock ["ket thuc gio lam"]`, `H roomNumbers ["phong may lam viec"]`, `I numberOrText ["tong so may"]`, `J numberOrText ["so may hoat dong"]`, `K numberOrText ["so may con loi"]`, `L text ["hdh windows"]`, `M text ["phan mem ms office"]`, `N text ["tinh trang netsupport"]`, `O text ["tinh trang am thanh"]`, `P speedMbps ["toc do internet"]`, `Q bulletList ["hien trang may lanh"]`, `R leadingNumber ["camera ho tro"]`, `S text ["ve sinh phong may"]`, `T text ["hoan thien bao tri"]`, `U text ["hinh anh phong may"]`.

- [ ] **Step 1: Viết test hỏng**: lấy bốn định nghĩa từ `BUILTIN_DEFINITIONS`, `validateDefinition` mỗi cái `ok`. Với mỗi mã và với tập tin mẫu (các tin `ROLL_START`, `ROLL_END`, `SHIFT_START`, `SHIFT_END` lấy từ `tests/techReport.test.ts`, thêm: biến thể gõ sai nhãn "Tên Truog" và "Tình trạng Netsuppot", tin sau mốc giờ, tin ngày khác, tin thiếu dòng Tên Trường, tin có dòng `- Tên Trường:` để TRỐNG (mã cũ bỏ tin này; bộ máy cũng không ra dòng nhưng có một mục cần xem), tin có dòng "Thời gian" ghi chữ, tin cuối ca không có dòng tốc độ), khẳng định `deepEqual(rowsInWindow(def, msgs, day).rows, techRowsInWindow(msgs, key, day, parseCutoff(def.window.cutoff)))` và `deepEqual(buildFillParts(def, rows, day, "Nguyễn Thu Hà"), { layout: TECH_LAYOUT[key], rows: techRowsForFill(rows), headerCells: techHeaderCells(key, day, "Nguyễn Thu Hà"), formulaCells: techFormulaCells(key, rows.length) })`. Thêm trường hợp không có tin nào cho mỗi mã.
- [ ] **Step 2: Chạy** test. Mong: FAIL, chưa có file JSON.
- [ ] **Step 3: Viết bốn file `.ts` và `index.ts`** theo bảng trên. Nếu một ca lệch, sửa định nghĩa hoặc engine cho đến khi bằng; không sửa `techReport.ts` để chiều test.
- [ ] **Step 4: Chạy** `npm test`. Mong: toàn bộ qua, test mới cũng qua.
- [ ] **Step 5: Commit** `feat(definitions): 4 báo cáo kỹ thuật dưới dạng định nghĩa, kèm phép thử tương đương`.

### Task 6: Nạp định nghĩa của khách từ thư mục

**Files:**
- Create: `src/definitions/loader.ts`
- Test: `tests/definitionLoader.test.ts`

**Interfaces:**
- Consumes: `validateDefinition`; `BUILTIN_DEFINITIONS` (Task 5); `config.techReports` (chỉ đọc); `config.dataDir`.
- Produces:
  - `export interface LoadResult { defs: ReportDefinition[]; problems: string[] }`
  - `export function loadDefinitions(customDir: string | null): LoadResult`: bắt đầu từ `BUILTIN_DEFINITIONS` (đã gộp sẵn trong mã, không đọc đĩa; đường dẫn không phụ thuộc vị trí file nên chạy được sau khi gộp thành `dist/`), rồi đọc `*.json` (bỏ BOM, UTF-8) của `customDir` theo thứ tự tên file (thiếu thư mục thì bỏ qua); file hỏng hoặc không hợp lệ chỉ thêm `problems` (nêu tên file và lỗi), không ném; mã trùng với bản dựng sẵn: bản dựng sẵn thắng và thêm một `problems`; mã trùng giữa hai file của khách: bản đầu theo tên file thắng.
  - `export function withConfigCutoffs(defs: ReportDefinition[]): ReportDefinition[]`: với `attendanceStart/attendanceEnd/shiftStart/shiftEnd` đặt `window.cutoff` từ `config.techReports.<code>Until`; mã khác giữ nguyên.
  - `export const customDefinitionsDir = (): string => path.join(config.dataDir, "definitions")`.

- [ ] **Step 1: Viết test hỏng** (thư mục tạm bằng `fs.mkdtempSync`): file JSON lỗi cú pháp không làm file khác ngừng nạp; file có BOM vẫn đọc được; định nghĩa không hợp lệ vào `problems`; mã `shiftEnd` trùng với bản dựng sẵn thì bản dựng sẵn thắng và có cảnh báo; `customDir` null hoặc không tồn tại không phải lỗi và vẫn trả đủ bốn định nghĩa dựng sẵn; `withConfigCutoffs` đổi mốc đúng mã.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài** theo chữ ký trên.
- [ ] **Step 4: Chạy** test và `npm run typecheck`. Mong: qua.
- [ ] **Step 5: Commit** `feat(definitions): nạp định nghĩa từ thư mục dựng sẵn và thư mục của khách`.

### Task 7: Cho `fill:tech-reports` chạy qua bộ máy (agent chính)

**Files:**
- Modify: `src/cli/fill-tech-reports.ts`
- Create: `src/definitions/review.ts`
- Test: `tests/definitionReview.test.ts`

**Interfaces:**
- Consumes: `loadDefinitions`, `withConfigCutoffs`, `rowsInWindow`, `buildFillParts`, `ReviewItem`.
- Produces: `export function writeReview(file: string, items: ReviewItem[]): void` (ghi qua `writeFileAtomic`; danh sách rỗng thì xóa file) và `export const reviewPath = (setId: string, code: string, day: string): string` = `output/<setId>/canxem_<code>_<day>.json` qua `setOutputDir` của `src/core/paths.ts`. Tên dùng tiền tố `canxem_` có chủ đích: các công cụ hiện có (`runner:status`, skill `xu-ly-muc-can-xem`, `src/runner/steps.ts`) đọc `review_<ngày>_<buổi>.json` với hình dạng riêng của báo cáo đầu/cuối buổi dạy, nên một file khác hình dạng mà trùng tiền tố sẽ bị đọc sai hoặc làm hỏng đếm. Việc để `runner:status` và panel hiển thị `canxem_*` là việc của plan sau; trước đó file chỉ để người xem tay.

- [ ] **Step 1: Viết test hỏng** cho `writeReview`: ghi hai mục rồi đọc lại bằng nhau; ghi danh sách rỗng thì file biến mất.
- [ ] **Step 2: Chạy** test. Mong: FAIL.
- [ ] **Step 3: Cài `writeReview`/`reviewPath`.**
- [ ] **Step 4: Sửa `fill-tech-reports.ts`**: thay `techRowsInWindow`, `TECH_LAYOUT`, `techHeaderCells`, `techFormulaCells`, `techRowsForFill`, `UNTIL` bằng định nghĩa từ `withConfigCutoffs(loadDefinitions(customDefinitionsDir()).defs)` (in `problems` bằng `console.warn`); mỗi mã `key` lấy `rowsInWindow` rồi `buildFillParts`, ghi `reviewPath(set.id, key, day)`; giữ nguyên chữ ký dòng (`rowsSignature([...rows, { reporter }])`), tên file, trạng thái và thông báo. `TechKey`, `TECH_KEYS` vẫn là kiểu cũ (lát này không đổi `ReportKey`).
- [ ] **Step 5: Chạy** `npm run typecheck` và `npm test`. Mong: qua.
- [ ] **Step 6: Commit** `feat(runner): fill:tech-reports dựng từ định nghĩa, ghi mục cần xem`.

### Task 8: Kiểm tay một lần bằng bản chép tạm (agent chính, cần người dùng đồng ý)

Phụ thuộc plan `2026-10-24-ban-cai-dat-beta.md` Task 4 (`config.json`) để Beta trỏ `dataDir` vào bản chép. Bước này mở Excel, subagent không làm. Không đụng bản gốc đang chạy: không sửa `config.ts` của nó, không ghi vào `data/` của nó (trạng thái dựng như `data/.<mã>-report.<bộ>.json` nằm dưới `config.dataDir`).

- [ ] **Step 1: Xin phép người dùng** chép các file tin `data/g*.json` và thư mục `data/mau bao cao new` của bản gốc vào một thư mục tạm (đặt trong scratchpad), và xác nhận không có chu trình `bot:runner` đang chạy dở (Excel dùng chung máy).
- [ ] **Step 2:** Ở Beta, checkout commit ngay TRƯỚC Task 7 (mã cũ) và đặt `config.json` với `dataDir` và `statusExportDir` trỏ vào thư mục tạm A; chạy `npm run fill:tech-reports -- --set NguoiA --force`. Quay về HEAD (mã mới), đặt `statusExportDir` sang thư mục tạm B với CÙNG `dataDir` chép, chạy lại cùng lệnh.
- [ ] **Step 3: So từng ô** của bốn file ở A và B (script đọc bằng `xlsx` dùng một lần, không đưa vào repo). Mong: giống nhau.
- [ ] **Step 4: Báo kết quả** cho người dùng, kèm ô nào lệch nếu có.

---

## Các plan sau (chưa viết, mỗi cái cần plan riêng)

- **Lát 2b, `ReportKey` thành chuỗi nạp lúc chạy** (mục C): 97 chỗ ở 21 file; cần tách `ReportKey` khỏi `REPORT_KEYS as const`, kiểm tra mã lúc chạy trong `resolve.ts`.
- **Lát 3, `cleaning` và bậc 2** (`dien`, `netsupport`, `loa`, `internet`, `mayTinh`): thêm kiểu dòng "giữ tin mới nhất theo khóa", ánh xạ giá trị, sắp xếp, điền Trường/Khu vực từ tên nhóm.
- **Lát 4, mẫu có dấu thay thế** (mục B), sau khi kiểm hai điều ghi ở spec.
- **Lát 5, khung giờ và chu kỳ tổng quát** (mục D), thay `phase`/`day` và `config.phases`.
- **Lát 6, giao diện định nghĩa trong panel** (mục E).
