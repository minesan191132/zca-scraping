# Báo Cáo Nhóm (Beta)

Đọc tin nhắn của các nhóm Zalo chỉ định từ **Zalo Desktop** (app Windows, không phải web), theo dõi tin mới theo thời gian thực và lưu về máy dưới dạng file JSON. Kèm một app điều khiển (panel) và kiểm giấy phép để phân phối cho người khác.

Bot không có bước đăng nhập riêng. Nó gắn vào phiên Zalo Desktop đã đăng nhập sẵn qua Chrome DevTools Protocol (CDP) và đọc nội dung từ DOM. Chế độ theo dõi còn quan sát WebSocket mà Zalo Desktop tự mở tới backend (qua CDP `Network`) để biết tin mới ở nhóm nào, rồi chỉ cào nhóm đó. Chỉ đọc: không có đường gửi hay trả lời tin.

> [!NOTE]
> Phụ thuộc vào cấu trúc DOM hiện tại và giao thức WebSocket nội bộ của Zalo Desktop. Đọc [Bảo trì & giới hạn đã biết](#bảo-trì--giới-hạn-đã-biết) trước khi chạy lâu dài.

## Phạm vi của bản này

Bản Beta là **lõi cào tin**: theo dõi, hàng chờ, cào, lưu, xuất `.xlsx` thô của một nhóm. Nó không kèm báo cáo nghiệp vụ nào (không có báo cáo theo mẫu Excel, không có bot trả lời, không có bot tổng hợp theo giờ). Người dùng cuối chỉ nhận lõi này, và dựng báo cáo của riêng họ lên trên, bằng [định nghĩa báo cáo](docs/dinh-nghia-bao-cao.md) khi engine hoàn thiện.

Cây mã còn chứa mã của hệ thống báo cáo đầy đủ mà bản Beta được tách ra từ đó (các thư mục `chat/`, `total/`, `lesson/`, `reportSets/`, `leave/`, `minutes/`, `master/`, `vision/`, `ocr/`, `runner/`). Phần đó không thuộc bản bán, không được đóng vào gói cài và không được mô tả ở đây.

| Tài liệu | Dành cho |
|---|---|
| [docs/huong-dan-khach-hang.md](docs/huong-dan-khach-hang.md) | Khách: cài, nhập giấy phép, khai nhóm, bật bot |
| [docs/van-hanh-ban-ban.md](docs/van-hanh-ban-ban.md) | Người bán: cấp giấy phép, phát hành, sao lưu khóa |
| [docs/dinh-nghia-bao-cao.md](docs/dinh-nghia-bao-cao.md) | Định dạng báo cáo bằng file JSON và trạng thái engine |
| `docs/superpowers/specs/`, `docs/superpowers/plans/` | Thiết kế và kế hoạch triển khai |

## Vì sao dùng Zalo Desktop thay vì web hay API `zca-js`

Hai hướng khác đã thử và bỏ:

- **Web (`chat.zalo.me`) qua Playwright và đăng nhập QR của `zca-js`**: mỗi lần chạy phải xác thực lại. Zalo chỉ cho một client hoạt động cùng lúc, nên phiên của bot và phiên bạn đang dùng đá nhau, phiên sau bị đăng xuất và phải quét QR liên tục.
- **Zalo Desktop**: là app Electron, DOM đọc được qua CDP như trình duyệt. Bot đọc thẳng vào phiên đã đăng nhập, không cần QR và không tranh client với bạn.

Playwright `connectOverCDP` không gắn được vào Electron của Zalo Desktop (lỗi `Browser.setDownloadBehavior`, vì CDP bản cũ). Vì vậy `src/scrape/cdp.ts` tự cài một client CDP tối giản qua WebSocket thô (`Runtime.evaluate`).

## Các thành phần

| Thành phần | Chạy từ mã nguồn | Mô tả |
|---|---|---|
| Theo dõi | `npx tsx src/cli/bot-watch-core.ts` | Chạy liên tục, là nơi duy nhất nghe tin (WebSocket nội bộ của Zalo Desktop, `src/watch/realtimeListener.ts`). Mỗi tin chỉ ghi tên nhóm vào hàng chờ `data/.scrape-events-<ngày>.jsonl`. Không cào, không ghi `data/<groupId>.json`. |
| Điều phối cào | `npx tsx src/cli/bot-dispatch.ts` | Chạy nền. Hàng chờ có nhóm và yên lặng `runner.quietSeconds` thì cào đúng các nhóm đó. Không dựng báo cáo. |
| Cào tay | `npm run bot:scrape` | Đọc hàng chờ, chỉ mở các nhóm trong đó, cuộn lấy lịch sử, đánh dấu đã xử lý rồi thoát. Hàng chờ rỗng thì thoát ngay, không đụng Zalo Desktop. |
| Xếp nhóm vào hàng chờ | `npm run scrape:add -- "Tên nhóm"` | Xếp một nhóm trong `config.targets` vào hàng chờ: nhóm mới chưa cào lần nào, hoặc ép cào lại. Chỉ ghi file. |
| Trạng thái | `npm run watch:status`, `npx tsx src/cli/dispatch-status.ts` | Bot còn sống không, nhịp tim gần nhất, hàng chờ, khoảng gián đoạn. Thoát mã 2 khi không sống. |
| Giấy phép | `npx tsx src/cli/license-info.ts` | In trạng thái giấy phép. Cấp giấy phép: `npm run license:issue` (chỉ máy người bán). |
| Xuất Excel | `npm run export:excel <groupId> [senderName]` | Xuất tin đã cào của một nhóm ra `.xlsx`, có thể lọc theo người gửi. |
| MCP server | `npm run mcp` | Cho Claude Code/Desktop đọc dữ liệu đã cào qua 3 tool chỉ-đọc. |
| Panel | `panel/` | App Electron: giấy phép, cấu hình, bật tắt hai bot, xem nhật ký. Dự án con có `package.json` riêng. |

Bản cài chạy cùng các CLI này đã gộp vào `dist/cli/*.js` bằng `esbuild`, chạy bằng chính `bao-cao-nhom.exe` ở chế độ Node (`ELECTRON_RUN_AS_NODE=1`) nên khách không cần cài Node.

## Bắt đầu nhanh (chạy từ mã nguồn)

Yêu cầu: Windows, Zalo Desktop đã cài và đăng nhập sẵn, [Node.js ≥ 22](https://nodejs.org/).

```bash
npm install
cp config.example.json config.json      # sửa targets thành đúng tên nhóm trên thanh bên Zalo
npx tsx src/cli/bot-watch-core.ts       # cửa sổ 1: nghe tin, xếp nhóm vào hàng chờ
npx tsx src/cli/bot-dispatch.ts         # cửa sổ 2: cào hàng chờ
```

Chỉ cào một lần bằng tay: `npm run scrape:add -- "Tên nhóm"` rồi `npm run bot:scrape`.

Lần chạy đầu, bot tự tắt và mở lại Zalo Desktop để bật cổng debug (xem [Luồng hoạt động](#luồng-hoạt-động-chi-tiết)). Phiên đăng nhập không mất vì nó nằm trong profile cục bộ của app, không nằm trong tiến trình.

Nếu có giấy phép (`license.json` ở thư mục dữ liệu), hoặc đang chạy từ mã nguồn, bot chạy. Bản đã gộp (`ZBOT_BUNDLED=1`) từ chối chạy nếu không có giấy phép hợp lệ và thoát với mã 3.

Lệnh kiểm tra:

```bash
npm test                # unit test (node:test)
npm run typecheck       # tsc --noEmit
npm run build:dist      # gộp CLI vào dist/ và kiểm (không file riêng tư, không khóa riêng)
```

## Cấu hình

Giá trị mặc định nằm trong `config.ts` và **không chứa nhóm, người, trường hay đường dẫn riêng nào**. Cấu hình của bạn nằm ở `config.json`, nạp đè lên mặc định lúc khởi động (`src/config/configFile.ts`):

- Nằm ở thư mục dữ liệu: `ZBOT_HOME` nếu đặt, nếu không thì thư mục gốc của repo. Bản cài dùng `%LOCALAPPDATA%\BaoCaoNhom\config.json`.
- Khóa lạ hoặc sai kiểu bị bỏ kèm cảnh báo. Mảng thay hẳn mảng mặc định, object gộp theo khóa.
- Giá trị sai (âm, không nguyên, `runner.quietSeconds` lớn hơn `runner.maxWaitSeconds`...) làm bot từ chối chạy, in một dòng `[config] ...` nêu khóa sai, và thoát mã 1.
- Bot chỉ đọc lúc khởi động; đổi xong phải khởi động lại bot.
- Test không đọc `config.json` thật mà đọc `tests/fixtures/config.test.json`.

```bash
npm run config:dump     # in mọi thông số và tài liệu của nó dưới dạng JSON (panel dựng form từ đây)
```

Mẫu: `config.example.json`. Các khóa mà bản bán đọc:

| Khóa | Ý nghĩa |
|---|---|
| `targets` | Tên hiển thị **chính xác** của nhóm cần lấy, đúng như trên thanh bên Zalo Desktop. Chỉ nhóm ở đây mới được theo dõi và cào. Rỗng thì chỉ cảnh báo. |
| `cdpPort` | Cổng debug CDP để mở và kết nối Zalo Desktop (mặc định `9222`). |
| `zaloExePath` | Đường dẫn `Zalo.exe`. Tự dò trong `%LOCALAPPDATA%\Programs\Zalo\Zalo-*\Zalo.exe`; chỉ đặt tay khi dò thất bại. |
| `autoLaunchZalo` | `true` = tự tắt và mở lại Zalo Desktop kèm cờ debug khi cần. Phải là `true` để bot theo dõi chạy. |
| `dataDir` | Thư mục chứa `data/` (một file `.json` mỗi nhóm). Mặc định `<thư mục dữ liệu>/data`. |
| `sinceTs` / `untilTs` | Mốc chặn dưới/trên (unix ms hoặc `null`) cho `bot:scrape` chạy tay. Điều phối cào không dùng. |
| `targetMessageCount` | Số tin tối đa lấy mỗi nhóm mỗi lần chạy. |
| `scrollDelayMs` | Khoảng ngẫu nhiên (ms) giữa các lần cuộn. |
| `watch.*` | Nhịp tim, thời gian coi là chết, dò cổng, nối lại: `heartbeatSeconds`, `deadAfterSeconds`, `minBlindSeconds`, `probeSeconds`, `silenceRestartMinutes` (0 = tắt), `reconnectMaxSeconds`. |
| `runner.*` | Điều phối cào: `quietSeconds` (yên lặng trước khi cào), `maxWaitSeconds`, `pollSeconds`, `maxConsecutiveFailures`, `maxScrapeAttempts`, `queueKeepDays`, `errorRetryMinutes`. |

`npm run config:show` in mọi thông số theo mục kèm đơn vị và mặc định (khác mặc định có dấu `*`).

> [!TIP]
> Càng nhiều nhóm trong `targets` thì một lần cào càng lâu: các nhóm được xử lý lần lượt trên cùng một kết nối CDP. Zalo chỉ có một cửa sổ, mở được một cuộc trò chuyện tại một thời điểm. Số nhóm không bị giới hạn cứng.

## Luồng hoạt động chi tiết

Mỗi lần cào (`bot:scrape` hoặc một vòng của điều phối cào):

0. Lấy khóa Zalo `data/.scrape.lock` (`src/core/scrapeLock.ts`). Nếu tiến trình khác đang điều khiển giao diện, `bot:scrape` từ chối và báo ai đang giữ; điều phối thử lại sau.
1. `ensureZaloReady()` (`src/scrape/desktopScraper.ts`) kiểm tra cổng debug `config.cdpPort`.
   - Cổng chưa mở: tắt Zalo (`taskkill /IM Zalo.exe`, chờ tối đa 4 giây rồi mới `/F` nếu chưa thoát) rồi mở lại kèm `--remote-debugging-port=9222`. Zalo Desktop là app single-instance (Electron `requestSingleInstanceLock`), nên mở thêm lần nữa khi đang chạy không gắn được cờ; bắt buộc tắt rồi mở lại.
   - Cổng đã mở: dùng luôn.
2. Kết nối cửa sổ chính qua CDP (`connectToZaloMainPage`), thử lại khoảng 20 giây vì sau khi mở lại, cửa sổ cần vài giây để tải xong `index.html`.
3. Chờ sidebar render xong (`waitForSidebarLoaded`).
4. Với mỗi nhóm trong hàng chờ:
   - Gõ tên nhóm vào ô tìm kiếm của sidebar (`#contact-search-input`), rồi bấm đúng nhóm khớp tên trong kết quả. Sidebar mặc định chỉ render nhóm hoạt động gần đây, nên nhóm lâu không có tin có thể vắng hẳn trong DOM; ô tìm kiếm query thẳng theo tên nên tránh được. Ô tìm kiếm luôn được xóa sạch sau mỗi lần tìm, kể cả khi thất bại, vì bot đang thao tác trên cửa sổ Zalo bạn dùng hàng ngày.
   - Cuộn vùng tin lên đầu nhiều lần để tải lịch sử, dừng khi chạm `config.targetMessageCount`, hoặc chiều cao vùng cuộn không đổi 3 lần liên tiếp (hết lịch sử), hoặc mọi tin đang thấy đều cũ hơn `sinceTs`.
   - Lọc theo `sinceTs` (chặn dưới) và `untilTs` (chặn trên).
   - Ghi vào `MessageStore` (`data/<groupId>.json`, dedupe theo `msgId`).

### Chế độ theo dõi thời gian thực (`watch`)

Bot theo dõi chạy liên tục, nguồn duy nhất là WebSocket (`src/watch/watch.ts`). Mỗi lần phát hiện tin chỉ ghi tên nhóm vào hàng chờ (không cào, không lưu tin).

Zalo Desktop tự mở một kết nối WebSocket tới backend chat để cập nhật UI (`src/watch/realtimeListener.ts`). Bot chỉ quan sát kết nối đó qua CDP `Network`, không tạo kết nối riêng. Nó giải mã frame `cmd=501`/`521` (tin mới) để lấy `idTo` (id hội thoại), so `idTo` với `groupId` đã biết của `config.targets` (học từ dữ liệu đã cào trong `data/`), rồi đưa đúng nhóm đó vào hàng chờ, kể cả khi bạn đang mở nhóm đó.

Giải mã cần key mã hoá trao đổi lúc kết nối mở. Vì vậy bot theo dõi luôn tắt và mở lại Zalo Desktop khi khởi động (xem Bảo trì #6), và chỉ nó đọc được nội dung tin: tiến trình khác gắn vào sau không có key.

Nhóm chưa cào lần nào chưa có `groupId` để so, nên nguồn này bỏ qua nhóm đó. Cách xử lý: `npm run scrape:add -- "Tên nhóm"`, để điều phối hoặc `bot:scrape` cào, rồi khởi động lại bot theo dõi.

Bot ghi nhịp tim và các khoảng gián đoạn vào `data/.watch-state.json` và `data/.watch-gaps.json`. Lỗi ghi các file này được thử lại và không làm nó thoát. Nó tự kiểm cổng debug mỗi `watch.probeSeconds` giây (hai lần liên tiếp không trả lời thì tắt, mở lại Zalo và gắn lại) và nối lại với thời gian chờ giãn dần tới `watch.reconnectMaxSeconds`. `watch.silenceRestartMinutes` (mặc định 0, tắt) khởi động lại Zalo khi không nhận khung WebSocket nào quá số phút đó.

### Hàng chờ giữa bot theo dõi và bot cào

- File `data/.scrape-events-<ngày>.jsonl` (một file mỗi ngày Việt Nam), mỗi dòng `{"t": tên nhóm đúng như config.targets, "at": thời điểm}`. Chỉ được nối thêm: bot theo dõi và `scrape:add` không đọc-sửa-ghi lại file, nên không thể ghi đè nhau.
- File thứ hai `data/.scrape-events.handled.jsonl` do điều phối hoặc `bot:scrape` (đang giữ khóa) nối thêm sau mỗi lần cào, ghi từng file ngày đã đọc tới byte nào. Một nhóm nằm trong hàng chờ khi còn dòng của nó sau mốc đó. Dùng vị trí byte thay vì đồng hồ nên tin đến đúng lúc bắt đầu cào không bị nuốt.
- File sự kiện cũ hơn `runner.queueKeepDays` ngày (mặc định 3, không tính hôm nay) tự bị xóa sau mỗi lần cào.
- Bot theo dõi chỉ thêm tên nhóm khi thấy tin mới và không chạm vào giao diện Zalo Desktop.
- Điều phối (hoặc `bot:scrape`) chụp lại hàng chờ kèm mốc byte, cào đúng các nhóm đó rồi đánh dấu đã cào tới mốc. Hàng chờ rỗng thì thoát ngay và in `hàng chờ rỗng`.
- Nhóm cào lỗi ở lại hàng chờ và được thử lại ở vòng sau, tối đa `runner.maxScrapeAttempts` lần (mặc định 3). Hết số lần thì bị bỏ khỏi hàng chờ, ghi log và cảnh báo kèm lệnh `scrape:add` để cào lại. Nhóm không có tin mới vẫn tính là đã cào. Không kết nối được Zalo Desktop thì không đánh dấu gì.
- Chỉ tiến trình giữ `data/.scrape.lock` mới điều khiển giao diện, nên không có chuyện hai tiến trình cùng bấm và cuộn một cửa sổ Zalo.

> [!NOTE]
> Các bot là tiến trình thường: đóng terminal (hay đóng panel, với bot do panel bật) là tắt, và không tự chạy lại khi crash hoặc khi máy khởi động lại. Muốn chạy nền cùng phiên đăng nhập, dùng tác vụ Windows `schtasks` hoặc PM2 như dịch vụ Windows. Mã không phụ thuộc cách bạn giữ tiến trình sống.

### Chạy debug thủ công (mở cổng CDP không qua bot)

Khi cần soi DOM hoặc probe CDP bằng tay (ví dụ cập nhật selector) mà không chạy cả một lượt quét:

```bash
npm run zalo:debug
curl http://127.0.0.1:9222/json/version     # có JSON trả về nghĩa là CDP sẵn sàng; đổi 9222 nếu đã đổi cdpPort
```

`zalo:debug` chỉ gọi `ensureZaloReady()`, in URL debug rồi thoát, không đụng `config.targets` hay `data/`. `src/cli/debug/*` là các script chẩn đoán dùng một lần để dò selector khi Zalo Desktop đổi giao diện.

## Bản bán: giấy phép, gói cài, cập nhật

- **Gói cài**: `npm run build:dist` ở thư mục gốc (gộp CLI vào `dist/`, `scripts/distCheck.mjs` chặn việc đưa file riêng tư hay khóa riêng vào), rồi trong `panel/`: `npm run build:product:unpack` (thử, không cài) hoặc `npm run build:product` (file cài NSIS + `latest.yml`). Cấu hình đóng gói: `panel/electron-builder.product.yml`.
- **Giấy phép**: file `{payload, sig}` ký Ed25519, gắn với MachineGuid của Windows, kiểm ngoại tuyến (`src/core/license.ts`, `licenseGate.ts`). Bot điều khiển Zalo thoát với mã 3 nếu giấy phép thiếu, sai chữ ký, hết hạn hay cấp cho máy khác. Khóa riêng nằm ngoài repo.
- **Cập nhật**: `electron-updater` qua GitHub Releases của repo công khai; bản mới cài ở lần mở panel sau, không bao giờ khi bot đang chạy.
- **Đặt tên** "Báo Cáo Nhóm", `appId` `com.baocaonhom.app`, thư mục dữ liệu `BaoCaoNhom`: rất khó đổi sau khi có khách cài.

Chi tiết từng việc: [docs/van-hanh-ban-ban.md](docs/van-hanh-ban-ban.md).

Không chạy hệ thống đầy đủ của tác giả cùng lúc với bản cài trên một máy: cả hai cùng điều khiển một Zalo Desktop qua cổng 9222.

## Cấu trúc dự án

Mã nguồn nằm trong `src/`. Ở gốc chỉ có cấu hình, tài liệu và dữ liệu. Kiểu dùng chung nằm ở `src/types/`.

```
config.ts                        mặc định mọi thông số (không chứa giá trị riêng); config.json nạp đè lên
config.example.json              mẫu config.json
package.json  tsconfig.json  README.md  CLAUDE.md

src/
  cli/                           mỗi lệnh một file; cli/debug/ là công cụ dò tay
  types/                         kiểu dùng chung, nhập bằng `import type { ... } from "../types/index.js"`
  core/                          paths.ts (mọi đường dẫn, ZBOT_HOME / ZBOT_CODE_ROOT), atomicWrite.ts (ghi nguyên tử, chịu được Windows),
                                 scrapeLock.ts (khóa giao diện Zalo), license.ts + licenseGate.ts (giấy phép)
  config/                        configFile.ts (nạp config.json), configCheck.ts (kiểm giá trị), configDoc.ts (mô tả cho config:show/dump)
  scrape/                        cào Zalo Desktop: desktopScraper.ts, cdp.ts (client CDP thô), scrapeSelectors.ts (selector DOM),
                                 scrapeQueue.ts / queueRun.ts / queueAdd.ts (hàng chờ)
  watch/                         watch.ts, realtimeListener.ts (WebSocket của Zalo qua CDP Network), watchState.ts (nhịp tim, gián đoạn)
  runner/                        dispatch.ts: bộ điều phối cào mỏng của bản bán
  store/                         messageStore.ts (data/<groupId>.json, dedupe)
  export/                        exportExcel.ts (xuất .xlsx từ dữ liệu đã cào)
  mcp/                           server.ts: MCP server chỉ-đọc
  definitions/                   engine định nghĩa báo cáo bằng dữ liệu (lát đầu), xem docs/dinh-nghia-bao-cao.md
scripts/                         build-dist.mjs, distCheck.mjs, các script PowerShell điền Excel qua COM
tests/                           unit test (node:test)
docs/                            tài liệu và thiết kế của bản Beta
panel/                           app Electron vận hành, dự án con có package.json riêng

<thư mục dữ liệu>/               (không commit)
  config.json  license.json
  data/<groupId>.json            mảng JSON ghi đè mỗi lần lưu, dedupe theo msgId, đặt tên theo group id thật
  data/.scrape-events*.jsonl, .watch-*.json, .scrape.lock   hàng chờ, nhịp tim, khóa
```

## Dữ liệu đầu ra

### `data/<groupId>.json`: kho lưu duy nhất

Mỗi cuộc trò chuyện một file JSON (mảng, pretty-print, sắp theo `ts` tăng dần). Đây là nơi lưu duy nhất của tin đã cào; không có kho phụ hay file xuất theo ngày. Mỗi lần lưu tin mới, cả mảng được ghi lại qua file tạm rồi đổi tên, để file không hỏng nếu bị ngắt giữa chừng. Dedupe theo `msgId`, nên cào lại không tạo tin trùng. Tên file là `groupId` thật (không phải slug tên nhóm), nên lịch sử không vỡ khi nhóm đổi tên.

Dạng `NormalizedMessage` (`src/store/messageStore.ts`):

```ts
{
  msgId: string;        // id gốc từ Zalo Desktop, hoặc hash nếu không có
  groupId: string;      // id hội thoại thật của Zalo: nhóm là "g<digits>", DM là id số của người kia
  groupName: string;    // tên hiển thị lúc cào, chỉ để tham khảo, không dùng làm khoá
  threadType: "group" | "user";
  senderId: string;     // id số thật của người gửi (đọc qua React fiber, không lấy từ DOM)
  senderName: string;   // rỗng nếu là tin của chính tài khoản (isSelf)
  isSelf: boolean;
  ts: number;            // unix ms
  msgType: string;       // "desktop.text"
  content: unknown;      // nội dung text
  source: "history" | "realtime";
}
```

> [!NOTE]
> `groupId` và `senderId` không lấy được từ DOM hay CSS như các trường còn lại. Chúng được đọc qua React internal fiber (`__reactFiber$...` gắn trên chính DOM node), vì Zalo Desktop không render các id này ra text hay attribute nào. Đây là phần dễ vỡ nhất của scraper, xem Bảo trì #1.

Cần bản dễ đọc để chia sẻ (giờ Việt Nam, lọc theo người gửi)? Dùng `npm run export:excel <groupId> [senderName]`.

## Bảo trì & giới hạn đã biết

Xếp theo khả năng gặp, cao đến thấp:

1. **Đọc `groupId`/`senderId` qua React internal fiber** (`src/scrape/desktopScraper.ts:readMsgIdentitySrc`). Dễ vỡ nhất, hơn cả selector CSS. Kỹ thuật này đọc property nội bộ của React (`__reactFiber$...`, `memoizedProps`), không phải API công khai của Zalo hay React. Chỉ cần Zalo nâng cấp React, không cần đổi UI hay class CSS, là cấu trúc fiber có thể đổi hẳn. Scraper tự vệ: nếu không đọc được `groupId` từ dòng nào trong cả batch, nó bỏ qua lưu và log cảnh báo `"could not read groupId..."` thay vì ghi sai. Thấy cảnh báo này liên tục thì soi lại cấu trúc fiber mới bằng `npm run zalo:debug` và `Runtime.evaluate` thủ công.

2. **Selector DOM** (`src/scrape/scrapeSelectors.ts`) gắn chặt vào bản UI hiện tại của Zalo Desktop. Mỗi lần Zalo cập nhật giao diện, các class có thể đổi và scraper âm thầm trả về rỗng hoặc báo `"sidebar item for ... not found"`. Cách sửa: chạy `npm run zalo:debug`, dùng `src/cli/debug/active-conversation.ts` hoặc `Runtime.evaluate` qua `src/scrape/cdp.ts` để soi DOM mới và cập nhật selector.

3. **Định dạng `msgId` và timestamp thay đổi theo loại tin.** Đã gặp: tin album ảnh có id `bb_msg_id_<ts>_<n>_<groupId>`, khác tin text thường (`bb_msg_id_<ts>`). Đã vá bằng cách chỉ lấy số ở đoạn đầu id. Các loại khác (sticker, file, voice, tin thu hồi...) chưa test kỹ. Thấy `content: ""` hoặc `timeLocal` lạ trong file export thì nhiều khả năng là một định dạng id mới chưa xử lý.

4. **Nguồn WebSocket (`src/watch/realtimeListener.ts`) dựa trên giao thức nhị phân chưa công bố của Zalo** (mã lệnh cmd/subCmd, mã hoá AES-GCM, nén gzip). Giao thức được dò ngược qua dự án `zca-js` và xác nhận bằng cách bắt gói tin qua CDP `Network`; không phải API chính thức, và Zalo có thể đổi bất cứ lúc nào mà UI không có dấu hiệu gì. Đây là nguồn duy nhất để bot theo dõi phát hiện nhóm có tin mới. Nếu nó hỏng, bot theo dõi mù (`watch:status` báo "MÙ", ghi khoảng gián đoạn "blind"). Triệu chứng: không còn log `[watch] realtime-ws: new message detected` dù có tin mới. Cách vớt tin sót: `npm run scrape:add -- "Tên nhóm"` rồi cào tay.

5. **`zaloExePath` tự dò theo cấu trúc thư mục cài đặt hiện tại** (`%LOCALAPPDATA%\Programs\Zalo\Zalo-<version>\Zalo.exe`). Nếu Zalo đổi cách cài (ví dụ sang Microsoft Store/MSIX), dò tự động sẽ thất bại; đặt `zaloExePath` thủ công trong `config.json`.

6. **`autoLaunchZalo: true` tắt Zalo Desktop dù bạn đang dùng dở.** Với `bot:scrape` và điều phối, chỉ xảy ra khi cổng debug chưa mở. Với bot theo dõi, xảy ra mỗi lần khởi động và mỗi lần nối lại hoặc khi cổng debug không trả lời, kể cả khi Zalo đã mở sẵn, vì nguồn WebSocket cần bắt key mã hoá trao đổi lúc kết nối. Không mất dữ liệu, chỉ gián đoạn UI vài giây. Không thể đặt `autoLaunchZalo: false` khi dùng bot theo dõi: nó báo lỗi. Đừng khởi động bot theo dõi lúc đang dùng Zalo dở.

7. **Tên nhóm gõ sai không báo lỗi.** `targets` phải trùng đúng chữ ở thanh bên Zalo. Nhóm gõ sai tên đơn giản là không được theo dõi. Cách chắc nhất: sao chép tên nhóm từ Zalo.

8. **Cảnh báo lỗi chỉ có trạng thái, không có thông báo đẩy.** Các bot ghi log ra console và file, có lệnh `...:status` (thoát mã 2 khi không sống), nhưng không tự gửi cảnh báo cho bạn.

9. **`data/` không tự dọn.** Mỗi `data/<groupId>.json` tăng dần theo số tin của nhóm. Không ảnh hưởng chức năng, nhưng nên theo dõi dung lượng khi chạy lâu; vì mỗi lần lưu ghi lại cả file, file càng lớn thì mỗi lần lưu càng chậm.

10. **`senderId` là id số thật, không ẩn danh.** Dữ liệu nội bộ Zalo đọc qua React fiber còn chứa số điện thoại, ngày sinh, avatar của người gửi, nhưng scraper chỉ lấy `fromUid`/`userId` và không lưu các trường nhạy cảm khác. Nếu sau này lấy thêm thông tin từ đó, cân nhắc kỹ trước khi ghi vào `data/`: file không mã hoá và không nên chia sẻ tuỳ tiện.

11. **Ghi file trạng thái trên Windows.** Đổi tên đè lên file đang bị tiến trình khác mở (kể cả chỉ để đọc) báo `EPERM`. File trạng thái của bot dùng `src/core/atomicWrite.ts` để thử lại, và lỗi ghi nhịp tim không làm bot theo dõi thoát. `src/store/messageStore.ts` (`data/<groupId>.json`) vẫn đổi tên theo cách cũ; nguy cơ thấp hơn vì chỉ bot cào đọc các file này và nó cào tuần tự.

12. **Rủi ro điều khoản.** Zalo có thể coi việc tự động hóa giao diện và đọc WebSocket nội bộ là không được phép. Bản Beta chỉ đọc, không gửi tin, nhưng điều đó không loại trừ rủi ro này.
