# zca-scrape-message

Đọc tin nhắn của các nhóm Zalo chỉ định từ **Zalo Desktop** (app Windows, không phải web), theo dõi tin mới theo thời gian thực, ghi ra file JSON, đồng bộ lên SQL Server và dựng các file Excel báo cáo. Tùy chọn: trả lời tự động trong một số nhóm theo kịch bản có sẵn.

Bot không có bước đăng nhập riêng. Nó gắn vào phiên Zalo Desktop đã đăng nhập sẵn qua Chrome DevTools Protocol (CDP) và đọc nội dung từ DOM. Chế độ theo dõi còn quan sát WebSocket mà Zalo Desktop tự mở tới backend (qua CDP `Network`) để biết tin mới nhanh hơn. Phần đọc không gửi gì đi. Chỉ `bot:chat` (tắt mặc định) gửi tin, bằng cách gõ vào ô soạn tin của chính phiên Zalo Desktop đó.

> [!IMPORTANT]
> **Đây là bản Beta "Báo Cáo Nhóm"**: lõi cào tin để bán cho người khác. Phần lớn README bên dưới mô tả hệ thống đầy đủ của tác giả (nhiều bot, báo cáo Excel theo người phụ trách). Bản bán KHÔNG kèm các báo cáo đó. Đọc [Bản Beta](#bản-beta-báo-cáo-nhóm) ngay dưới đây để biết bản bán gồm gì và khác ở đâu.

> [!NOTE]
> Phụ thuộc vào cấu trúc DOM hiện tại của Zalo Desktop. Đọc [Bảo trì & giới hạn đã biết](#bảo-trì--giới-hạn-đã-biết) trước khi chạy lâu dài.

Tài liệu liên quan (trong `docs/`): [van-hanh-ban-ban.md](docs/van-hanh-ban-ban.md) (cấp giấy phép, phát hành, sao lưu khóa), [huong-dan-khach-hang.md](docs/huong-dan-khach-hang.md) (cài và dùng, gửi cho khách), [dinh-nghia-bao-cao.md](docs/dinh-nghia-bao-cao.md) (định nghĩa báo cáo bằng file JSON), và các bản thiết kế trong `docs/superpowers/`.

## Bản Beta (Báo Cáo Nhóm)

Bản bán chỉ gồm lõi cào tin, một bộ điều phối mỏng, panel điều khiển và kiểm giấy phép. Không có bot chat, bot tổng, bộ báo cáo Excel theo người, đọc ảnh, đồng bộ SQL Server.

**Khác với hệ thống đầy đủ**

| | Hệ thống đầy đủ (chạy từ mã nguồn) | Bản bán |
|---|---|---|
| Cấu hình | `config.ts` | `config.json` trong `%LOCALAPPDATA%\BaoCaoNhom` (nạp đè lên mặc định, mặc định không chứa giá trị riêng nào). Mẫu: `config.example.json` |
| Dữ liệu | `data/`, `output/` cạnh mã | `%LOCALAPPDATA%\BaoCaoNhom\data`. Hai biến môi trường `ZBOT_HOME` (dữ liệu, cấu hình) và `ZBOT_CODE_ROOT` (mã) tách hai nơi; chỉ `src/core/paths.ts` đọc chúng |
| Bot | `bot:watch`, `bot:runner`, `bot:chat`, `bot:total`, `bot:scrape` | `bot:watch` (`bot-watch-core`) và `bot:dispatch` (chỉ cào hàng chờ). Bot chạy bằng chính `bao-cao-nhom.exe` ở chế độ Node (`ELECTRON_RUN_AS_NODE=1`), khách không cần cài Node |
| Mã | chạy `tsx src/cli/*.ts` | `npm run build:dist` gộp các CLI bằng esbuild vào `dist/cli/*.js`; `scripts/distCheck.mjs` chặn việc đưa file riêng tư hay khóa riêng vào `dist` |
| Giấy phép | không | bắt buộc: bot điều khiển Zalo thoát với mã 3 nếu không có giấy phép hợp lệ (`src/core/license.ts`, `licenseGate.ts`) |
| Cập nhật | không | `electron-updater` qua GitHub Releases; cài ở lần mở panel sau, không bao giờ khi bot đang chạy |
| Báo cáo | 15 mã báo cáo | chưa kèm. Engine định nghĩa báo cáo bằng dữ liệu nằm trong `src/definitions/` (xem [dinh-nghia-bao-cao.md](docs/dinh-nghia-bao-cao.md)) |

**Lệnh cho người làm bản bán**

```bash
npm run build:dist                 # gộp CLI vào dist/ và kiểm (không file riêng tư, không khóa riêng)
npm run license:issue -- --customer "<tên>" --machine <MachineGuid> --days 90 --key <khóa riêng PEM> --out <file>   # CHỈ máy tác giả
cd panel && npm run build:product:unpack   # thử không cài: panel/dist-product/win-unpacked
cd panel && npm run build:product          # file cài NSIS + latest.yml
```

Tên sản phẩm "Báo Cáo Nhóm", `appId` `com.baocaonhom.app` và thư mục dữ liệu `BaoCaoNhom` rất khó đổi sau khi có khách cài. Quy trình cấp giấy phép và phát hành: [van-hanh-ban-ban.md](docs/van-hanh-ban-ban.md).

Không chạy `bot:watch` hay `bot:runner` của hệ thống đầy đủ cùng lúc với bản cài trên một máy: cả hai cùng điều khiển một Zalo Desktop qua cổng 9222.

## Vì sao dùng Zalo Desktop thay vì web hay API `zca-js`

Hai hướng khác đã thử và bỏ:

- **Web (`chat.zalo.me`) qua Playwright và đăng nhập QR của `zca-js`**: mỗi lần chạy phải xác thực lại. Zalo chỉ cho một client hoạt động cùng lúc, nên phiên của bot và phiên bạn đang dùng đá nhau, phiên sau bị đăng xuất và phải quét QR liên tục.
- **Zalo Desktop**: là app Electron, DOM đọc được qua CDP như trình duyệt. Bot đọc thẳng vào phiên đã đăng nhập, không cần QR và không tranh client với bạn.

Playwright `connectOverCDP` không gắn được vào Electron của Zalo Desktop (lỗi `Browser.setDownloadBehavior`, vì CDP bản cũ: Electron 22, Chrome 108). Vì vậy `src/scrape/cdp.ts` tự cài một client CDP tối giản qua WebSocket thô (`Runtime.evaluate`, và `Input.*` cho việc gõ của `bot:chat`).

## Tính năng

| Chế độ | Lệnh | Mô tả |
|---|---|---|
| Theo dõi thời gian thực | `npm run bot:watch` | Chạy liên tục, là nơi duy nhất nghe tin (WebSocket nội bộ của Zalo Desktop, xem `src/watch/realtimeListener.ts`). Mỗi tin đi vào hai luồng: hàng chờ cào `data/.scrape-events-<ngày>.jsonl` và hộp thư chat `data/.chat-inbox.jsonl`. Không cào, không ghi `data/<groupId>.json`. |
| Cào và dựng báo cáo | `npm run bot:runner` | Chạy nền. Hàng chờ có nhóm và yên lặng thì cào, đồng bộ DB, trích xuất, cập nhật Excel của từng người phụ trách, đánh dấu tin. Tự khôi phục khi `bot:watch` từng gián đoạn. |
| Báo cáo tổng | `npm run bot:total` | Chạy nền. Lúc 9:00 và 15:00 xuất các file trạng thái đuôi `-auto` từ kho tin cục bộ, tùy chọn in ra máy in. Không cào. |
| Cào tay | `npm run bot:scrape` | Dùng khi runner không chạy: đọc hàng chờ, chỉ mở các nhóm trong đó, cuộn lấy lịch sử, xóa nhóm vừa xử lý khỏi hàng chờ rồi thoát. Hàng chờ rỗng thì thoát ngay, không đụng Zalo Desktop. |
| Xếp nhóm vào hàng chờ | `npm run scrape:add -- "Tên nhóm"` | Xếp một nhóm trong `config.targets` vào hàng chờ: nhóm mới chưa cào lần nào, hoặc ép cào lại. Chỉ ghi file. |
| Cào và dựng cho cả hôm nay | `npm run today` | Cào mọi nhóm về 17:30 tối hôm trước, đồng bộ DB, dựng lại mọi giai đoạn của hôm nay. Không làm báo cáo tổng. |
| Trả lời tự động | `npm run bot:chat` | Đọc hộp thư chat, trả lời bằng câu có sẵn theo `chat-rules.json`. Tùy chọn. |
| Trạng thái | `watch:status`, `runner:status`, `chat:status`, `total:status` | Bot còn sống không, vòng gần nhất, hàng chờ, khoảng gián đoạn. |
| Khôi phục | `npm run recover:missing` | Khi `bot:watch` từng chết: cào lại đúng các nhóm còn thiếu báo cáo và liệt kê tin đã lỡ. |
| Cấu hình | `npm run config:show` | In mọi thông số theo mục, kèm mặc định (khác mặc định có dấu `*`). |
| Xuất Excel | `npm run export:excel` | Xuất tin đã cào của một nhóm ra `.xlsx`, có thể lọc theo người gửi. |
| MCP server | `npm run mcp` | Cho Claude Code/Desktop đọc dữ liệu đã cào qua 3 tool chỉ-đọc. |

Kho `data/<groupId>.json` (một mảng JSON cho mỗi cuộc trò chuyện, dedupe theo `msgId`) do các tiến trình có cào ghi: `bot:runner`, `bot:scrape`, `recover:missing`, `today`.

`bot:watch` và `bot:scrape` phối hợp qua hàng chờ `data/.scrape-events-<ngày>.jsonl`. Mỗi tin là một dòng chỉ được nối thêm. Hàng chờ là các nhóm còn dòng chưa cào: `bot:watch` thêm, runner (hoặc `bot:scrape`) đọc, cào đúng các nhóm đó rồi đánh dấu đã xử lý. Nhóm được thêm trong lúc đang cào vẫn còn lại. `bot:watch` không cào và không bấm trong giao diện Zalo Desktop; chỉ khi nối lại hoặc khi Zalo không trả lời cổng debug nó mới tắt, mở lại Zalo (và giữ `data/.scrape.lock` lúc đó). Mọi thứ điều khiển giao diện dùng chung khóa `data/.scrape.lock`. Chi tiết ở [Hàng chờ giữa `bot:watch` và `bot:scrape`](#hàng-chờ-giữa-botwatch-và-botscrape).

## Bắt đầu nhanh

Yêu cầu:
- Windows, đã cài Zalo Desktop và đăng nhập sẵn tài khoản cần lấy dữ liệu
- [Node.js ≥ 22](https://nodejs.org/)

```bash
npm install
```

Mở `config.ts`, sửa `targets` thành đúng tên hiển thị của các nhóm cần lấy (xem bảng cấu hình bên dưới), rồi chạy hai bot nền, mỗi lệnh một cửa sổ terminal:

```bash
npm run bot:watch      # nghe tin, xếp nhóm vào hàng chờ (tắt và mở lại Zalo Desktop lúc khởi động)
npm run bot:runner     # cào hàng chờ và dựng báo cáo
```

Chỉ cào một lần bằng tay: `npm run scrape:add -- "Tên nhóm"` rồi `npm run bot:scrape`.

Lần chạy đầu, bot tự tắt và mở lại Zalo Desktop để bật cổng debug (xem [Luồng hoạt động](#luồng-hoạt-động-chi-tiết)). Phiên đăng nhập không mất vì nó nằm trong profile cục bộ của app, không nằm trong tiến trình.

## Cấu hình (`config.ts`)

`config.ts` là nơi duy nhất để chỉnh thông số vận hành, chia 13 mục: Zalo, targets, scraping, watch, runner, recovery, chat, sessions, phases, total, print, vision, techReports. Mỗi thông số có chú thích về ý nghĩa, đơn vị và ví dụ ngay trong file. Bot chỉ đọc file lúc khởi động, nên đổi xong phải khởi động lại bot liên quan.

Giá trị sai (âm, không nguyên, `runner.quietSeconds` lớn hơn `runner.maxWaitSeconds`, `chat.heartbeatSeconds` quá lớn so với `watch.deadAfterSeconds`, giờ buổi không tăng dần...) làm bot từ chối chạy và báo tên khóa sai. `chat-rules.json` là kịch bản trả lời riêng, không thuộc `config.ts`.

```bash
npm run config:show     # giá trị theo mục kèm đơn vị, mặc định, bot nào đọc; khác mặc định có dấu *
```

| Trường | Ý nghĩa |
|---|---|
| `cdpPort` / `cdpUrl` | Cổng debug CDP để mở và kết nối Zalo Desktop (mặc định `9222`). |
| `zaloExePath` | Đường dẫn `Zalo.exe`. Tự dò trong `%LOCALAPPDATA%\Programs\Zalo\Zalo-*\Zalo.exe` (lấy bản mới nhất); chỉ đặt tay khi dò thất bại. |
| `autoLaunchZalo` | `true` = tự tắt và mở lại Zalo Desktop kèm cờ debug khi cần. Phải là `true` để `bot:watch` chạy (nó luôn khởi động lại Zalo lúc bắt đầu) và để chạy không người trực. |
| `dataDir` | Thư mục gốc chứa `data/` (một file `.json` mỗi nhóm). |
| `statusExportDir` | Gốc của mọi file báo cáo trạng thái (mặc định `data/export/trang-thai`, phải là đường dẫn tuyệt đối). Một ngày ra `<statusExportDir>/<yyMM>/<yyMMdd>/`. Đổi giá trị không di chuyển file cũ. |
| `targets` | Tên hiển thị chính xác của nhóm cần lấy, đúng như trên sidebar Zalo Desktop. Chỉ nhóm ở đây mới được theo dõi, cào và (nếu có trong `chat-rules.json`) trả lời. |
| `recoveryIgnoreTargets` | Nhóm không bao giờ gửi báo cáo buổi dạy (nhóm thử). Khôi phục không coi chúng là "thiếu báo cáo" và không cào lại. Phải là tập con của `targets`. |
| `groupAliases` | Chỉ để thử: `{ "bot test": "LC_BìnhMinh_BTAN" }` làm cho báo cáo gửi vào nhóm thử được đọc như của nhóm trường thật (có trường, khu vực, mã phòng), nên ra dòng trong Excel. Ghi "Phòng Máy: PM3" trong tin để không trùng phòng thật PM1. Dòng của nhóm thử nằm trong Excel thật của buổi; thử xong đặt `{}` rồi `runner:once` dựng lại buổi. |
| `sinceTs` | Mốc chặn dưới (unix ms) cho `bot:scrape` chạy tay. Dùng `todayAt(giờ, phút)`, tính một lần lúc bot khởi động, nên bot chạy qua đêm giữ mốc của hôm qua. `null` = không chặn. `bot:runner` không dùng: nó tự tính lại mỗi vòng, từ 17:30 tối hôm trước. |
| `untilTs` | Mốc chặn trên (unix ms), chỉ áp dụng cho `bot:scrape` chạy tay (runner và khôi phục luôn cào đến hiện tại). Chỉ lọc kết quả cuối, không ảnh hưởng việc cuộn. `null` = không chặn. Dùng để cố định khung giờ (ví dụ 8h-12h) khi job chạy trễ. |
| `targetMessageCount` | Số tin tối đa lấy mỗi nhóm mỗi lần chạy. |
| `scrollDelayMs` | Khoảng ngẫu nhiên (ms) giữa các lần cuộn. |

`excelMaxColumnWidth` (mặc định 50, hợp lệ 10 đến 255) là bề rộng tối đa mà cột của file báo cáo tự nới theo chữ trong dòng dữ liệu; cột không bao giờ hẹp hơn mẫu, chữ dài hơn bị cắt ở mép cột, không xuống dòng, chiều cao dòng không đổi (riêng 4 báo cáo kỹ thuật vẫn xuống dòng). Không áp cho LỊCH NGHỈ PHÉP và hai file tổng. Đổi xong khởi động lại `bot:runner` và `bot:total`.

Các thông số vận hành nằm trong đối tượng con (giá trị đang đặt trong `config.ts`; mặc định gốc của từng khóa xem `npm run config:show`, ví dụ `runner.quietSeconds` gốc 120 và `watch.heartbeatSeconds` gốc 30):

| Đối tượng | Khóa (mặc định) |
|---|---|
| `watch` | `heartbeatSeconds` 15, `deadAfterSeconds` 90, `minBlindSeconds` 60, `probeSeconds` 30, `silenceRestartMinutes` 0 (tắt), `reconnectMaxSeconds` 300 |
| `runner` | `quietSeconds` 30, `maxWaitSeconds` 600, `pollSeconds` 5, `dirtyCheckSeconds` 60, `dirtyRetrySeconds` 300, `watchWarmupSeconds` 90, `maxConsecutiveFailures` 3, `maxScrapeAttempts` 3, `queueKeepDays` 3, `errorRetryMinutes` 10 |
| `recovery` | `marginMinutes` 5 |
| `chat` | `pollSeconds` 3, `heartbeatSeconds` 30, `skipBackoffSeconds` 45, `sentLedgerMinutes` 10, `echoWindowSeconds` 120, `restorePreviousConversation` false |
| `sessions` | `chieuFromHour` 12, `toiFromHour` 18 |
| `techReports` | `attendanceStartUntil` "08:30", `attendanceEndUntil` "12:30", `shiftStartUntil` "09:00", `shiftEndUntil` "12:00" |

Ví dụ khung giờ:
- 8h-12h cố định (chạy tay): `sinceTs: todayAt(8, 0)`, `untilTs: todayAt(12, 0)`.
- 6h sáng tới lúc chạy: `sinceTs: todayAt(6, 0)`, `untilTs: null`.

> [!TIP]
> Càng nhiều nhóm trong `targets` thì một lần cào càng lâu: các nhóm được xử lý lần lượt trên cùng một kết nối CDP. Zalo chỉ có một cửa sổ, mở được một cuộc trò chuyện tại một thời điểm, nên việc cào và việc gửi của `bot:chat` cũng xếp hàng dùng chung. Số nhóm không bị giới hạn cứng.

## Luồng hoạt động chi tiết

Mỗi lần cào (`bot:scrape` hoặc một vòng của `bot:runner`):

0. Lấy khóa Zalo `data/.scrape.lock` (`src/core/scrapeLock.ts`). Nếu tiến trình khác đang điều khiển giao diện, `bot:scrape` từ chối và báo ai đang giữ; runner thử lại sau.
1. `ensureZaloReady()` (`src/scrape/desktopScraper.ts`) kiểm tra cổng debug `config.cdpPort`.
   - Cổng chưa mở: tắt Zalo (`taskkill /IM Zalo.exe`, chờ tối đa 4 giây rồi mới `/F` nếu chưa thoát) rồi mở lại kèm `--remote-debugging-port=9222`. Zalo Desktop là app single-instance (Electron `requestSingleInstanceLock`), nên mở thêm lần nữa khi đang chạy không gắn được cờ; bắt buộc tắt rồi mở lại.
   - Cổng đã mở: dùng luôn.
2. Kết nối cửa sổ chính qua CDP (`connectToZaloMainPage`), thử lại khoảng 20 giây vì sau khi mở lại, cửa sổ cần vài giây để tải xong `index.html`.
3. Chờ sidebar render xong (`waitForSidebarLoaded`).
4. Với mỗi nhóm trong hàng chờ:
   - Gõ tên nhóm vào ô tìm kiếm của sidebar (`#contact-search-input`), rồi bấm đúng nhóm khớp tên trong kết quả. Sidebar mặc định chỉ render nhóm hoạt động gần đây, nên nhóm lâu không có tin có thể vắng hẳn trong DOM; ô tìm kiếm query thẳng theo tên nên tránh được. Ô tìm kiếm luôn được xóa sạch sau mỗi lần tìm, kể cả khi thất bại, vì bot đang thao tác trên cửa sổ Zalo bạn dùng hàng ngày.
   - Cuộn vùng tin lên đầu nhiều lần để tải lịch sử, dừng khi chạm `config.targetMessageCount`, hoặc chiều cao vùng cuộn không đổi 3 lần liên tiếp (hết lịch sử), hoặc mọi tin đang thấy đều cũ hơn `sinceTs`.
   - Lọc theo `sinceTs` (chặn dưới) và `untilTs` (chặn trên; runner và khôi phục truyền `null`).
   - Ghi vào `MessageStore` (`data/<groupId>.json`, dedupe theo `msgId`).

### Chế độ theo dõi thời gian thực (`watch`)

`npm run bot:watch` chạy liên tục, nguồn duy nhất là WebSocket (`src/watch/watch.ts`). Mỗi lần phát hiện tin chỉ ghi tên nhóm vào hàng chờ (không cào, không lưu tin). Nếu nhóm nằm trong `chat-rules.json`, nó ghi thêm tin chữ vào hộp thư chat.

Zalo Desktop tự mở một kết nối WebSocket tới backend chat để cập nhật UI (`src/watch/realtimeListener.ts`). Bot chỉ quan sát kết nối đó qua CDP `Network`, không tạo kết nối riêng. Nó giải mã frame `cmd=501`/`521` (tin mới) để lấy `idTo` (id hội thoại), nội dung tin chữ và người gửi, so `idTo` với `groupId` đã biết của `config.targets` (học từ dữ liệu đã cào trong `data/`), rồi đưa đúng nhóm đó vào hàng chờ, kể cả khi bạn đang mở nhóm đó.

Giải mã cần key mã hoá trao đổi lúc kết nối mở. Vì vậy `bot:watch` luôn tắt và mở lại Zalo Desktop khi khởi động (xem Bảo trì #6), và chỉ `bot:watch` đọc được nội dung tin: tiến trình khác gắn vào sau không có key.

Nhóm chưa cào lần nào chưa có `groupId` để so, nên nguồn này bỏ qua nhóm đó. Cách xử lý: `npm run scrape:add -- "Tên nhóm"`, để runner hoặc `bot:scrape` cào, rồi khởi động lại `bot:watch`.

Trước đây còn nguồn thứ hai là popup thông báo (toast, `znotification.html`) làm dự phòng. Đã bỏ vì toast là thông báo của Windows, không phải cửa sổ Zalo nên không bắt được tin, và việc nối vào cửa sổ đó làm `bot:watch` tự thoát khi nó đóng. Tin sót khi WebSocket hỏng được vớt bằng `recover:missing` và bước khôi phục của runner (cào lại nhóm còn thiếu báo cáo trong khoảng gián đoạn). Lịch cào bù mỗi 60 phút đã bỏ từ 2026-10-20.

`bot:watch` ghi nhịp tim và các khoảng gián đoạn vào `data/.watch-state.json` và `data/.watch-gaps.json`. Lỗi ghi các file này (ví dụ Windows chặn đổi tên đè lên file đang bị tiến trình khác đọc) được thử lại và không làm nó thoát. Nó tự kiểm cổng debug mỗi `watch.probeSeconds` giây (hai lần liên tiếp không trả lời thì tắt, mở lại Zalo và gắn lại) và nối lại với thời gian chờ giãn dần tới `watch.reconnectMaxSeconds`. `watch.silenceRestartMinutes` (mặc định 0, tắt) khởi động lại Zalo khi không nhận khung WebSocket nào quá số phút đó; số khung được ghi vào `data/.watch-frames.log`.

### Hàng chờ giữa `bot:watch` và `bot:scrape`

- File `data/.scrape-events-<ngày>.jsonl` (một file mỗi ngày Việt Nam), mỗi dòng `{"t": tên nhóm đúng như config.targets, "at": thời điểm}`. Chỉ được nối thêm: `bot:watch` và `scrape:add` không đọc-sửa-ghi lại file, nên không thể ghi đè nhau (bản cũ dùng một file JSON chung và có thể làm mất nhóm khi watch và runner ghi cùng lúc).
- File thứ hai `data/.scrape-events.handled.jsonl` do runner hoặc `bot:scrape` (đang giữ khóa) nối thêm sau mỗi lần cào, ghi từng file ngày đã đọc tới byte nào. Một nhóm nằm trong hàng chờ khi còn dòng của nó sau mốc đó. Dùng vị trí byte thay vì đồng hồ nên tin đến đúng lúc bắt đầu cào không bị nuốt.
- File sự kiện cũ hơn `runner.queueKeepDays` ngày (mặc định 3, không tính hôm nay) tự bị xóa sau mỗi lần cào. Hàng chờ cũ `data/.scrape-queue.json` (nếu còn) được nhập một lần khi watch, runner hoặc `bot:scrape` khởi động, rồi đổi tên thành `.migrated`.
- `bot:watch` chỉ thêm tên nhóm khi thấy tin mới (trừ nhóm chỉ chat `"scrape": false`) và không chạm vào giao diện Zalo Desktop. Thêm tay bằng `npm run scrape:add -- "Tên nhóm"`.
- Runner (hoặc `bot:scrape`) chụp lại hàng chờ kèm mốc byte, cào đúng các nhóm đó rồi đánh dấu đã cào tới mốc. Hàng chờ rỗng thì thoát ngay và in `hàng chờ rỗng`.
- Nhóm cào lỗi ở lại hàng chờ và được thử lại ở vòng sau, tối đa `runner.maxScrapeAttempts` lần (mặc định 3), mỗi lần cách nhau thời gian yên lặng. Hết số lần thì bị bỏ khỏi hàng chờ, ghi log và cảnh báo trong vòng của runner kèm lệnh `scrape:add` để cào lại. Nhóm không có tin mới vẫn tính là đã cào. Không kết nối được Zalo Desktop thì không đánh dấu gì.
- Chỉ tiến trình giữ `data/.scrape.lock` mới điều khiển giao diện, nên không có chuyện hai tiến trình cùng bấm và cuộn một cửa sổ Zalo.

> [!NOTE]
> Các bot là tiến trình Node thường: đóng terminal là tắt, và không tự chạy lại khi crash hoặc khi máy khởi động lại. Muốn chạy nền cùng phiên đăng nhập, dùng tác vụ Windows `schtasks` hoặc PM2 như dịch vụ Windows. Mã không phụ thuộc cách bạn giữ tiến trình sống.

## Sử dụng

```bash
npm run bot:watch           # theo dõi liên tục: xếp nhóm có tin mới vào hàng chờ, ghi hộp thư chat
npm run bot:runner          # cào hàng chờ, đồng bộ DB, trích xuất, dựng Excel
npm run bot:total           # báo cáo tổng 9:00 và 15:00 (file -auto)
npm run bot:chat            # trả lời tự động theo chat-rules.json (tùy chọn)
npm run bot:scrape          # cào tay các nhóm trong hàng chờ (rỗng thì thoát ngay)
npm run scrape:add -- "Tên nhóm"                 # xếp nhóm vào hàng chờ cào
npm run watch:status | runner:status | chat:status | total:status   # tình trạng các bot (thoát mã 2 nếu không sống)
npm run runner:once -- [--set <id>] [--day D] [--buoi B]   # dựng lại MỘT buổi, không cào
npm run today -- [--set <id>]                    # cào và dựng lại cả ngày hôm nay
npm run recover:missing -- [--day D] [--buoi B] [--dry-run]   # khôi phục tin lỡ khi watch từng chết
npm run config:show         # xem toàn bộ cấu hình
npm run export:excel <groupId> [senderName]      # xuất .xlsx từ dữ liệu đã cào
npm run mcp                 # MCP server (stdio) cho Claude Code/Desktop
npm run zalo:debug          # chỉ mở Zalo Desktop kèm cổng debug, không quét
npm test                    # unit test
npm run typecheck           # tsc --noEmit
```

Danh sách đầy đủ các lệnh (`fill:*`, `photos:*`, `total:once`...) nằm ở mục Commands của `CLAUDE.md`.

`export:excel` đọc dữ liệu đã có trong `data/<groupId>.json` và không tự cào, nên nhóm đó phải được cào ít nhất một lần. Tìm `groupId` bằng tên file trong `data/`, hoặc gọi tool `list_threads` của MCP server (trả về cả `groupId` lẫn `groupName`).

### Chạy debug thủ công (mở cổng CDP không qua bot)

Khi cần soi DOM hoặc probe CDP bằng tay (ví dụ cập nhật selector) mà không chạy cả một lượt quét:

```bash
npm run zalo:debug
```

Lệnh chỉ gọi `ensureZaloReady()`, in URL debug rồi thoát, không đụng `config.targets` hay `data/`. `src/cli/debug/active-conversation.ts` và `src/cli/debug/zalo.ts` là các script chẩn đoán dùng một lần để dò selector khi Zalo Desktop đổi giao diện.

Kiểm tra cổng debug đã mở chưa:

```bash
curl http://127.0.0.1:9222/json/version
```

Có JSON trả về (không phải connection refused) nghĩa là CDP sẵn sàng. Đổi `9222` nếu bạn đã đổi `config.cdpPort`.

### `bot:runner`: cào, trích xuất, điền Excel

`bot:runner` là tiến trình thứ ba, chạy 24/24 cạnh `bot:watch`. Khi hàng chờ có nhóm và yên lặng `runner.quietSeconds` (30 giây trong `config.ts` hiện tại, mặc định gốc 120; trần `runner.maxWaitSeconds`, 10 phút, kể từ nhóm đầu tiên), nó chạy một vòng:

1. Khôi phục nếu `bot:watch` có khoảng gián đoạn chưa được khôi phục.
2. Cào các nhóm trong hàng chờ.
3. Nạp tin và đồng bộ DB.
4. Với mỗi bộ báo cáo có báo cáo đầu/cuối buổi mới: trích xuất và dựng các file Excel (`fill:status-reports`).
5. Với mỗi bộ, sau các giai đoạn: dựng các báo cáo theo ngày (vệ sinh, nội quy, điện, nghỉ phép, biên bản, hai file tổng bảo trì và kết nối internet, 4 báo cáo kỹ thuật). Trước các file cần ảnh (nghỉ phép, biên bản), runner đọc ảnh một lần nếu `vision.enabled` bật.
6. Gộp mark của mọi bộ và đánh dấu tin (`StatusId`/`HasRead`) vào DB một lần.
7. Ghi một dòng vào `output/runner-log.jsonl` và cập nhật `data/.runner-state.json`.

File Excel ra `<statusExportDir>/<yyMM>/<yyMMdd>/<id>/`. Bước dựng `.xlsm` cũ (`fill:report`) đã bỏ khỏi vòng này từ 2026-09-29.

Sau `runner.maxConsecutiveFailures` (3) vòng lỗi liên tiếp (cào hoặc đồng bộ), runner báo LỖI và nằm im, nhưng sau `runner.errorRetryMinutes` (10 phút) lại thử nếu hàng chờ còn việc (đặt 0 để ngừng hẳn tới khi khởi động lại); hàng chờ vẫn nguyên. Lỗi dựng của riêng một file chỉ được báo và thử lại sau 5 phút.

```bash
npm run bot:runner                                   # không khởi động lại bot:watch (một lần cào vẫn mở lại Zalo nếu cổng debug đóng, như bot:scrape)
npm run runner:status                                # sống hay chết, vòng gần nhất (kèm thời gian từng bước và từng nhóm), hàng chờ, buổi chưa dựng xong (thoát mã 2 nếu không sống)
npm run runner:timing -- [--last N]                  # thống kê thời gian vòng và thời gian cào từng nhóm (trung bình, p95, lâu nhất) từ output/runner-log.jsonl
npm run runner:once -- [--set <id>] [--day D] [--buoi B]   # dựng lại MỘT buổi, không cào (dùng sau khi sửa output/<id>/overrides.json)
```

File trạng thái:
- `data/.runner-state.json`: nhịp tim.
- `output/runner-log.jsonl`: mỗi vòng một dòng.
- `data/.runner-built.json`: các báo cáo đã dựng. Báo cáo nằm trên đĩa mà chưa có ở đây sẽ được dựng, nên crash giữa vòng hay cào tay không làm mất buổi nào.
- `output/<id>/review_<ngày>_<buổi>.json`: các mục cần xem của từng buổi.
- `data/.scrape.lock`: khóa chung cho mọi thứ điều khiển giao diện Zalo (`bot:runner`, `bot:scrape`, `bot:chat`, `recover:missing`, `runner:once`, `today`, và `bot:watch` lúc nối lại).

Giới hạn: cào điều khiển giao diện Zalo Desktop (bấm, cuộn) nên có thể làm gián đoạn người đang gõ trong Zalo.

### `bot:chat`: trả lời theo kịch bản

`bot:chat` đọc tin chữ mới trong các nhóm liệt kê ở `chat-rules.json` và trả lời bằng câu có sẵn theo tình huống (ví dụ báo cáo có máy lỗi). `bot:watch` vẫn là nơi duy nhất nghe tin và chia mỗi tin vào hai luồng độc lập: hàng chờ cào (cho `bot:runner`) và hộp thư chat `data/.chat-inbox.jsonl` (cho `bot:chat`).

Câu bot gửi được ghi vào sổ trước khi gửi, để `bot:watch` bỏ qua khi nó dội lại (không cào thừa, không tự trả lời chính mình). Gửi qua giao diện Zalo Desktop: mở đúng nhóm, gõ vào ô soạn tin, Enter. Trước mỗi thao tác gõ, bot kiểm lại rằng cả tên nhóm đang chọn lẫn `placeholder` của ô soạn tin đúng là nhóm đích. Ô soạn tin đang có chữ dở thì hoãn, không gõ đè. Bot giữ khóa `data/.scrape.lock` chung với `bot:runner`.

```bash
npm run bot:chat        # chạy nền; nạp lại chat-rules.json khi file đổi (file sai thì giữ bản cũ)
npm run chat:status     # còn sống không, gửi thật hay dry-run, nhóm nào, bao nhiêu tin chờ (thoát mã 2 nếu không sống)
```

`chat-rules.json` (mẫu: `docs/superpowers/specs/2026-09-25-bot-chat-rules.sample.json`) gồm:
- `dryRun`.
- `limits`: `maxRepliesPerMinute`, `maxReplyDelaySeconds`, `cooldownSecondsPerRule`.
- `groups`: tên nhóm (phải thuộc `config.targets`) và `rules`, xét theo thứ tự, tình huống đầu tiên khớp thì trả lời.

Điều kiện `when`: `loaiBaoCao` (`DauBuoi`/`CuoiBuoi`), `mayLoi: true` (số máy lỗi lớn hơn 0 hoặc có ghi chú như "IT bảo trì"; số 0 thì không), `keywords` (không phân biệt dấu và hoa thường). `reply` chèn được `{senderName}`, `{soMayLoi}`, `{chiTietLoi}`.

**Gắn thẻ người (@).** Thêm `"mention": ["Trần Văn Bình"]` vào một tình huống (tối đa 5 tên, đúng như trong danh sách thành viên nhóm). Bot gõ `@` rồi gõ luôn tên để danh sách gợi ý của Zalo thu về đúng người. Nếu danh sách không thu gọn, bot xóa phần tên vừa gõ và tìm trong danh sách đầy đủ bằng phím mũi tên. Sau khi chọn đúng người, bot mới gõ `reply`. Kết quả là tin `@Trần Văn Bình <reply>` với thẻ thật.

Bot không bao giờ gắn thẻ cả nhóm (@All). Nếu không gắn được thẻ (không thấy tên, hai người trùng tên, danh sách không hiện, Enter không tạo thẻ), bot không gửi gì: nó xóa bản nháp và ghi log `gắn thẻ @...: <lý do>`.

Ví dụ: `"mention": ["Trần Văn Bình"], "reply": "{chiTietLoi}. Ghi nhận kiểm tra."` gửi `@Trần Văn Bình máy 35 không lên; máy 41 hỏng màn hình. Ghi nhận kiểm tra.`

**Nhóm chỉ chat.** Thêm `"scrape": false` vào một nhóm (cạnh `"rules"`). `bot:watch` vẫn đưa tin của nhóm vào hộp thư chat nhưng không xếp vào hàng chờ cào, và khôi phục (`bot:runner`, `recover:missing`) bỏ qua nhóm đó. Nhóm này không có dữ liệu mới trong `data/` và DB. Nó vẫn phải nằm trong `config.targets`, và nếu chưa từng được cào thì phải cào một lần để watch biết mã nhóm. Mặc định là `true`. Đổi xong thì khởi động lại `bot:watch`, `bot:runner` và `bot:chat`.

File trạng thái: `data/.chat-inbox.jsonl` và `data/.chat-inbox.cursor` (hộp thư và vị trí đã đọc), `data/.chat-done.json` (tin đã xử lý), `data/.chat-sent.json` (câu vừa gửi, để nhận ra tin dội lại), `data/.chat-state.json` (nhịp tim). Tạo file `data/.chat-off` để dừng gửi ngay.

Giới hạn: chỉ tin chữ; chưa trả lời dạng trích dẫn; mỗi lần gửi chiếm giao diện Zalo (nên dành riêng một bản Zalo cho bot khi có nhiều nhóm); nội dung chỉ lấy từ WebSocket của `bot:watch`, mất WebSocket thì bot không trả lời; tin không khớp tình huống nào bị bỏ qua và không có dòng log; Zalo có thể coi việc tự gửi tin là bất thường.

## Bộ báo cáo theo người phụ trách

Báo cáo thuộc về người, không thuộc về nhóm Zalo. Mỗi người là một "bộ" trong `config.reportSets`; file của họ ra thư mục riêng `<statusExportDir>/<yyMM>/<yyMMdd>/<id>/` (bot tự tạo).

```ts
reportSets: [
    { id: "NguyenVanA", reports: ["netsupport", "loa", "internet", "mayTinh", "dien", "cleaning", "attendance"] },
    // { id: "NguyenVanB", reports: [/* các mã báo cáo của người B */] },
],
```

Trong config mẫu, bộ `NguoiB` giữ 4 báo cáo `leave` (lịch nghỉ phép), `maintenance` (thời gian chưa bảo trì, ghi thẳng vào file tổng), `internetSpeed` (trạng thái kết nối internet, ghi thẳng vào file tổng) và `minutes` (quản lý biên bản); xem [docs/bao-cao-nhi.md](docs/bao-cao-nhi.md). Bốn báo cáo này cùng 4 báo cáo kỹ thuật không xuất file `-auto` của `bot:total`. Tốc độ Internet lấy từ dòng "Tốc độ Internet" của tin CÔNG VIỆC CUỐI CA LÀM, không còn đọc ảnh tốc độ.

- `id` là tên thư mục: không chứa `\ / : * ? " < > |`, không trùng giữa các bộ, không phân biệt hoa thường. `reports` là mã nội bộ, không có mặc định. Xem danh sách mã, loại, tiêu đề tin nguồn và mẫu Excel bằng `npm run reports:list`. Mọi tin từ mọi nhóm trong `targets` đi qua mọi bộ, và một mã có thể nằm trong nhiều bộ.
- Cấu hình sai không làm bot dừng. Bộ hoặc mục sai bị tắt và báo lỗi rõ ở màn hình khởi động của `bot:runner`/`bot:total`, `runner:status` và `total:status` (thoát mã 2), `config:show` và tóm tắt vòng. Các bộ khác chạy bình thường.
- Lỗi được cô lập theo (bộ, mã báo cáo). Mẫu thiếu hay file đang mở trong Excel chỉ làm hỏng đúng file đó: bản cũ được giữ, và vòng sau thử lại riêng file đó trong ngày (`data/.runner-failed.json`, qua ngày thì bỏ). Dấu `StatusId` chưa ghi được vào DB nằm ở `data/.runner-marks-pending.json` và được ghi nốt ở vòng sau. Mỗi bộ có thư mục làm việc riêng `output/<id>/` (gồm `overrides.json`), nên sửa dữ liệu của bộ này không đụng bộ khác.
- `output/overrides.json` cũ không còn được dùng. Chép tay vào `output/<id>/overrides.json` (runner sẽ cảnh báo).
- Bốn mã báo cáo kỹ thuật (từ 2026-10-22), chỉ lấy tin gửi trong ngày:

  | Mã | Báo cáo | Lấy tin đến hết |
  |---|---|---|
  | `attendanceStart` | ĐIỂM DANH ĐẦU BUỔI | 08:30 |
  | `attendanceEnd` | ĐIỂM DANH CUỐI BUỔI | 12:30 |
  | `shiftStart` | CÔNG VIỆC ĐẦU CA LÀM | 09:00 |
  | `shiftEnd` | CÔNG VIỆC CUỐI CA LÀM | 12:00 |

  Mốc giờ đặt ở `config.techReports`. Cả bốn dùng mẫu `05 - FORM EXCEL BAO CAO KY THUAT.xlsx`, mỗi báo cáo một file, mỗi tin một dòng. `bot:runner` dựng chúng (chạy tay: `npm run fill:tech-reports -- --set <id>`) và chúng không vào file `-auto` của `bot:total`. Trong config mẫu, bộ `NguoiA` giữ hai điểm danh; bộ `NguoiC` (`reporterName: "Chưa phân công"`, in ở ô "Nhân viên báo cáo") giữ hai công việc ca. Xem [docs/bao-cao-nhu.md](docs/bao-cao-nhu.md) và [docs/bao-cao-tam.md](docs/bao-cao-tam.md).
- Đọc ảnh (`src/vision/`): ảnh đi kèm tin ĐIỂM DANH ĐẦU/CUỐI BUỔI hoặc CÔNG VIỆC ĐẦU CA LÀM luôn qua OCR trên máy. Nếu OCR không thấy ảnh nghỉ phép hay biên bản, bó ảnh bị bỏ và không gọi agent. Bó có tin CÔNG VIỆC CUỐI CA LÀM thì không bị bỏ, vì ảnh biên bản đi cùng tin đó. Đọc lại tay: `npm run photos:read -- --bundle <id>`.
- Thêm người mới: dùng skill `.claude/skills/cau-hinh-nguoi-phu-trach`. Thêm một loại báo cáo mới còn cần code (đăng ký mã, cách đọc tin, bố cục mẫu, test).
- Thiết kế: [docs/superpowers/specs/2026-10-06-bo-bao-cao-theo-nguoi-design.md](docs/superpowers/specs/2026-10-06-bo-bao-cao-theo-nguoi-design.md).

## Báo cáo buổi dạy

Luồng tự động: `bot:watch` → hàng chờ → `bot:runner` (cào → `sync:db` → trích xuất → điền Excel → `mark:messages`) → agent giám sát (`runner:status`, các mục cần xem ở `output/<id>/review_<ngày>_<buổi>.json`, sửa qua `output/<id>/overrides.json` rồi `runner:once`).

Luồng chạy tay khi runner không chạy: `bot:scrape` → `sync:db -- --apply` → `extract:reports -- --buoi <sang|chieu|toi>` → xem `output/<id>/review.json` → `fill:status-reports -- output/<id>/output.json` → `mark:messages -- output/<id>/marks.json`.

Mỗi lần chỉ xử lý một buổi của một ngày (ranh giới buổi ở `config.sessions`) và tạo các file trạng thái trong `<statusExportDir>/<yyMM>/<yyMMdd>/<id>/`. Mã trích xuất nằm trong `src/lesson/` và có test (`npm test`). Excel cần Microsoft Excel cài trên máy.

Tên Trường và Phường/Xã trong 4 file trạng thái (NETSUPPORT, ÂM THANH, INTERNET, MÁY TÍNH) được chép nguyên văn từ tin của nhóm trường; tin cũ thiếu hai dòng này thì lấy từ tên nhóm. File MÁY TÍNH xếp theo XẾP LOẠI từ A đến E, dòng chưa có xếp loại nằm cuối, cùng trường nằm liền nhau. Nhãn, tiêu đề và giá trị gõ sai đã biết nằm ở `src/constants/spellingAliases.ts` (thêm một dòng là parser nhận thêm dạng sai đó, cần khởi động lại bot).

Quy trình báo cáo buổi dạy của hệ thống đầy đủ không có trong bản công khai này.

Khi `bot:watch` từng chết, runner tự khôi phục (chỉ cào lại các nhóm còn thiếu báo cáo). `npm run recover:missing` làm việc đó bằng tay và liệt kê tin đã lỡ. Xem tình trạng bằng `npm run watch:status`.

## Cấu trúc dự án

Mã nguồn nằm trong `src/`. Ở gốc chỉ có cấu hình, tài liệu và dữ liệu. Kiểu dùng chung nằm ở `src/types/`. Bảng thư mục đầy đủ và quy tắc đặt mã mới nằm ở `.claude/RULES/1-system-structure.md`.

```
config.ts                        SỬA Ở ĐÂY: nhóm cần theo dõi và mọi thông số vận hành (13 mục)
chat-rules.json                  kịch bản trả lời của bot:chat (theo nhóm)
package.json  tsconfig.json  README.md  CLAUDE.md

src/
  cli/                           mỗi `npm run ...` trỏ tới một file ở đây; cli/debug/ là công cụ dò tay
  types/                         kiểu dùng chung, nhập bằng `import type { ... } from "../types/index.js"`
  core/                          paths.ts (mọi đường dẫn), atomicWrite.ts (ghi file nguyên tử, chịu được Windows),
                                 scrapeLock.ts (khóa chung cho thao tác giao diện Zalo)
  constants/                     reportTitles.ts (tiêu đề tin nguồn và nhãn báo cáo dùng chung), spellingAliases.ts (cách viết sai đã biết của nhãn, tiêu đề, giá trị; parser đọc qua lesson/spelling.ts); chỉ dữ liệu
  config/                        configCheck.ts (kiểm giá trị lúc khởi động), configDoc.ts (mô tả cho config:show),
                                 clockTime.ts (đọc mốc "HH:MM")
  scrape/                        cào Zalo Desktop: desktopScraper.ts, cdp.ts (client CDP thô), scrapeSelectors.ts
                                 (selector DOM), scrapeQueue.ts / queueRun.ts / queueAdd.ts (hàng chờ)
  watch/                         watch.ts (chia tin vào hàng chờ và hộp thư chat), realtimeListener.ts (WebSocket
                                 của Zalo qua CDP Network), watchState.ts (nhịp tim, khoảng gián đoạn)
  runner/                        bot:runner: lịch chờ, một vòng, trạng thái, thời gian
  chat/                          bot:chat: kịch bản, khớp tình huống, hộp thư, gửi tin, giới hạn
  total/                         bot:total: báo cáo tổng 9:00 và 15:00, in
  lesson/                        đọc báo cáo, chia buổi, khôi phục, dựng dòng và điền file Excel
  reportSets/                    bộ báo cáo theo người; registry.ts đăng ký mã báo cáo
  leave/  minutes/  speed/       nghỉ phép, biên bản (phần người duyệt); speed/ chỉ còn đổi đơn vị tốc độ Internet sang Mbps
  master/                        cập nhật các file tổng qua Excel
  vision/  ocr/                  gom ảnh, đọc ảnh, OCR
  store/                         messageStore.ts (data/<groupId>.json, dedupe), kết nối DB
  export/                        exportExcel.ts (xuất .xlsx từ dữ liệu đã cào)
  mcp/                           server.ts: MCP server chỉ-đọc (list_threads, get_recent_messages, search_messages)
scripts/                         script PowerShell điền và in Excel qua COM, benchLoad.ts
tests/                           unit test (node:test)
docs/                            van-hanh-ban-ban.md, huong-dan-khach-hang.md, dinh-nghia-bao-cao.md, spec và kế hoạch của bản Beta
panel/                           app Electron vận hành, dự án con có package.json riêng

data/                            dữ liệu chạy (không commit)
  <groupId>.json                 mảng JSON ghi đè mỗi lần lưu, dedupe theo msgId, đặt tên theo group id thật
  .scrape-events*.jsonl, .watch-*.json, .runner-*.json, .chat-*.json, .scrape.lock   hàng chờ, nhịp tim, trạng thái, khóa
  export/trang-thai/             file Excel báo cáo (mặc định của statusExportDir)
output/                          kết quả trung gian của trích xuất và nhật ký runner (không commit)
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

Cần bản dễ đọc để chia sẻ (giờ Việt Nam, lọc theo người gửi)? Dùng `npm run export:excel <groupId> [senderName]`. File Excel báo cáo buổi dạy là thứ khác: runner dựng trong `<statusExportDir>/<yyMM>/<yyMMdd>/<id>/`.

## Bảo trì & giới hạn đã biết

Xếp theo khả năng gặp, cao đến thấp:

1. **Đọc `groupId`/`senderId` qua React internal fiber** (`src/scrape/desktopScraper.ts:readMsgIdentitySrc`). Dễ vỡ nhất, hơn cả selector CSS. Kỹ thuật này đọc property nội bộ của React (`__reactFiber$...`, `memoizedProps`), không phải API công khai của Zalo hay React. Chỉ cần Zalo nâng cấp React, không cần đổi UI hay class CSS, là cấu trúc fiber có thể đổi hẳn. Scraper tự vệ: nếu không đọc được `groupId` từ dòng nào trong cả batch, nó bỏ qua lưu và log cảnh báo `"could not read groupId..."` thay vì ghi sai. Thấy cảnh báo này liên tục thì soi lại cấu trúc fiber mới bằng `npm run zalo:debug` và `Runtime.evaluate` thủ công.

2. **Selector DOM** (`src/scrape/scrapeSelectors.ts`) gắn chặt vào bản UI hiện tại của Zalo Desktop. Mỗi lần Zalo cập nhật giao diện, các class có thể đổi và scraper âm thầm trả về rỗng hoặc báo `"sidebar item for ... not found"`. Cách sửa: chạy `npm run zalo:debug`, dùng `src/cli/debug/active-conversation.ts` hoặc `Runtime.evaluate` qua `src/scrape/cdp.ts` để soi DOM mới và cập nhật selector. `bot:chat` còn phụ thuộc vào ô soạn tin (`#richInput`, `placeholder` dạng "Nhập @, tin nhắn tới <tên nhóm>", class `empty`). Nếu nó đổi, bot từ chối gửi (chốt kiểm nhóm đích thất bại) thay vì gõ nhầm.

3. **Định dạng `msgId` và timestamp thay đổi theo loại tin.** Đã gặp: tin album ảnh có id `bb_msg_id_<ts>_<n>_<groupId>`, khác tin text thường (`bb_msg_id_<ts>`). Đã vá bằng cách chỉ lấy số ở đoạn đầu id. Các loại khác (sticker, file, voice, tin thu hồi...) chưa test kỹ. Thấy `content: ""` hoặc `timeLocal` lạ trong file export thì nhiều khả năng là một định dạng id mới chưa xử lý.

4. **Nguồn WebSocket (`src/watch/realtimeListener.ts`) dựa trên giao thức nhị phân chưa công bố của Zalo** (mã lệnh cmd/subCmd, mã hoá AES-GCM, nén gzip). Giao thức được dò ngược qua dự án `zca-js` và xác nhận bằng cách bắt gói tin qua CDP `Network`; không phải API chính thức, và Zalo có thể đổi bất cứ lúc nào mà UI không có dấu hiệu gì. Đây là nguồn duy nhất để `bot:watch` phát hiện nhóm có tin mới. Nếu nó hỏng, `bot:watch` mù (`watch:status` báo "MÙ", ghi khoảng gián đoạn "blind") và phải dùng `recover:missing` để vớt tin sót. `bot:chat` cũng phụ thuộc hoàn toàn vào nguồn này: WebSocket hỏng thì bot chat ngừng trả lời chứ không đoán nội dung. Triệu chứng: không còn log `[watch] realtime-ws: new message detected` dù có tin mới.

5. **`zaloExePath` tự dò theo cấu trúc thư mục cài đặt hiện tại** (`%LOCALAPPDATA%\Programs\Zalo\Zalo-<version>\Zalo.exe`). Nếu Zalo đổi cách cài (ví dụ sang Microsoft Store/MSIX), dò tự động sẽ thất bại; đặt `zaloExePath` thủ công trong `config.ts`.

6. **`autoLaunchZalo: true` tắt Zalo Desktop dù bạn đang dùng dở.** Với `bot:scrape` và runner, chỉ xảy ra khi cổng debug chưa mở. Với `bot:watch`, xảy ra mỗi lần khởi động và mỗi lần nối lại hoặc khi cổng debug không trả lời, kể cả khi Zalo đã mở sẵn, vì nguồn WebSocket cần bắt key mã hoá trao đổi lúc kết nối (xem `src/watch/realtimeListener.ts`). Không mất dữ liệu, chỉ gián đoạn UI vài giây. Không thể đặt `autoLaunchZalo: false` khi dùng `bot:watch`: nó báo lỗi. Đừng khởi động `bot:watch` lúc đang dùng Zalo dở.

7. **Bù tin lỡ có giới hạn.** Khi `bot:watch` chết, khoảng gián đoạn được ghi lại và runner (hoặc `recover:missing`) cào lại các nhóm còn thiếu báo cáo của buổi đó. Nhưng nếu máy tắt hoặc ngủ đúng giờ lên lịch của agent, hoặc cả watch lẫn runner không chạy cả ngày, thì không gì tự quét bù cho ngày đó; chạy tay `recover:missing --day ... --buoi ...`. Khôi phục chỉ xét buổi hiện tại.

8. **Cảnh báo lỗi chỉ có trạng thái, không có thông báo đẩy.** Các bot ghi log ra console và file, có lệnh `...:status` (thoát mã 2 khi không sống), nhưng không tự gửi cảnh báo cho bạn. Nếu chạy qua Task Scheduler, phải tự xem `runner:status`, `watch:status`, `chat:status`, hoặc dùng agent giám sát.

9. **`data/` không tự dọn.** Mỗi `data/<groupId>.json` tăng dần theo số tin của nhóm. Không ảnh hưởng chức năng, nhưng nên theo dõi dung lượng khi chạy lâu; vì mỗi lần lưu ghi lại cả file, file càng lớn thì mỗi lần lưu càng chậm. Hộp thư chat `data/.chat-inbox.jsonl` cũng chưa được xoay file.

10. **`senderId` là id số thật, không ẩn danh.** Dữ liệu nội bộ Zalo đọc qua React fiber (`readMsgIdentitySrc`) còn chứa số điện thoại, ngày sinh, avatar của người gửi, nhưng scraper chỉ lấy `fromUid`/`userId` và không lưu các trường nhạy cảm khác. Nếu sau này lấy thêm thông tin từ đó, cân nhắc kỹ trước khi ghi vào `data/`: file không mã hoá và không nên chia sẻ tuỳ tiện.

11. **Ghi file trạng thái trên Windows.** Đổi tên đè lên file đang bị tiến trình khác mở (kể cả chỉ để đọc) báo `EPERM`. File trạng thái của bot (nhịp tim, hàng chờ, sổ chat...) dùng `src/core/atomicWrite.ts` để thử lại, và lỗi ghi nhịp tim không làm `bot:watch` thoát. `src/store/messageStore.ts` (`data/<groupId>.json`) vẫn đổi tên theo cách cũ; nguy cơ thấp hơn vì chỉ runner đọc các file này và runner cào tuần tự.

12. **Tự gửi tin (`bot:chat`) có rủi ro với tài khoản.** Zalo có thể coi việc gõ tự động là bất thường. Mỗi lần gửi, bot chuyển cuộc trò chuyện đang mở của phiên Zalo Desktop và có thể làm gián đoạn người đang dùng. Nên dành riêng một bản Zalo cho bot khi có nhiều nhóm, thử ở nhóm `bot test` với `"dryRun": true` trước, và nhớ công tắc dừng khẩn cấp `data/.chat-off`.

## Lên lịch chạy tự động

Các bot chạy nền (`bot:watch`, `bot:runner`, `bot:total`, `bot:chat`) không cần lịch. Chúng chỉ cần được khởi động cùng phiên đăng nhập và giữ sống. Cách giữ sống: tác vụ Windows `schtasks`, hoặc PM2 như dịch vụ Windows. `autoLaunchZalo: true` bảo đảm Zalo Desktop tự khởi động lại kèm cổng debug, kể cả khi máy chưa mở Zalo hoặc Zalo đang mở không kèm cờ debug.
