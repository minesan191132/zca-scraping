# CLAUDE.md

Hướng dẫn cho Claude Code (claude.ai/code) khi làm việc trong repo này.

## Dự án là gì

**Báo Cáo Nhóm (Beta)**: đọc tin nhắn của các nhóm Zalo từ **Zalo Desktop** (app Windows, không phải chat.zalo.me) bằng cách gắn vào nó qua Chrome DevTools Protocol, cào DOM lấy nội dung, và (ở chế độ theo dõi) quan sát WebSocket của chính Zalo Desktop qua CDP `Network` như một tín hiệu nhanh, làm hết sức, cho biết "nhóm X có tin mới" (`src/watch/realtimeListener.ts`). Chỉ đọc: không có đường gửi tin, không có bước đăng nhập riêng, dùng lại phiên Zalo Desktop đã đăng nhập.

Đây là bản để phân phối cho người khác: lõi cào tin, một bộ điều phối mỏng và panel Electron. Nó **không** kèm báo cáo nghiệp vụ nào. Cây mã còn chứa mã của hệ thống báo cáo đầy đủ mà bản này được tách ra (các thư mục `chat/`, `total/`, `lesson/`, `reportSets/`, `leave/`, `minutes/`, `master/`, `vision/`, `ocr/`, `runner/` ngoài `dispatch.ts`); phần đó không thuộc bản bán và không được đóng vào gói. README là nguồn sự thật cho thiết kế và luồng dữ liệu.

## Lệnh

```bash
npm install
npm run typecheck                          # tsc --noEmit
npm test                                   # unit test (node:test, tests/<tên>.test.ts)
npm run build:dist                         # gộp CLI vào dist/ bằng esbuild và kiểm (scripts/distCheck.mjs)
npx tsx src/cli/bot-watch-core.ts          # bot theo dõi (lõi): chỉ xếp nhóm có tin mới vào hàng chờ
npx tsx src/cli/bot-dispatch.ts            # bộ điều phối cào mỏng: cào đúng các nhóm trong hàng chờ
npm run bot:scrape                         # cào tay đúng các nhóm trong hàng chờ; hàng chờ rỗng thì thoát ngay
npm run scrape:add -- "Tên nhóm"           # xếp một nhóm trong config.targets vào hàng chờ
npm run watch:status                       # bot theo dõi còn sống không (thoát mã 2 khi không sống)
npm run zalo:debug                         # chỉ mở Zalo Desktop kèm cổng debug rồi thoát, để dò CDP tay
npm run config:show                        # in mọi thông số theo mục, kèm mặc định
npm run config:dump                        # như trên nhưng JSON sau dấu @@JSON@@ (panel dựng form từ đây)
npm run export:excel -- <groupId> [senderName]   # xuất tin đã cào của một nhóm ra .xlsx
npm run mcp                                # MCP server chỉ-đọc qua stdio
npm run license:issue -- --customer "<tên>" --machine <MachineGuid> --days 90 --key <khóa riêng PEM> --out <file>   # CHỈ máy người bán: cấp file giấy phép Ed25519 (không nằm trong dist)
cd panel && npm run lint && npm run typecheck && npm test      # panel có eslint, vitest riêng
cd panel && npm run build:product:unpack   # thử gói bán, không cài
cd panel && npm run build:product          # file cài NSIS + latest.yml
```

`curl http://127.0.0.1:9222/json/version` kiểm cổng debug CDP đang mở (phải trả JSON, không phải connection refused).

Tài liệu: `README.md` (thiết kế, cấu hình, bảo trì), `docs/huong-dan-khach-hang.md`, `docs/van-hanh-ban-ban.md` (cấp giấy phép, phát hành, sao lưu khóa), `docs/dinh-nghia-bao-cao.md` (engine định nghĩa báo cáo).

## Bot theo dõi và bot cào phối hợp qua hàng chờ

Bot theo dõi chỉ nối một dòng cho mỗi tin vào `data/.scrape-events-<ngày>.jsonl` (`src/scrape/scrapeQueue.ts`: chỉ nối thêm, không đọc-sửa-ghi, nên theo dõi và cào không ghi đè nhau). Bộ điều phối (`src/runner/dispatch.ts`) hoặc `bot:scrape` chụp hàng chờ (các nhóm cùng số byte đã đọc của mỗi file), cào đúng các nhóm đó rồi nối một bản ghi vào `.scrape-events.handled.jsonl` (`src/scrape/queueRun.ts`). Nhóm xếp vào giữa lúc cào nằm sau mốc nên vẫn còn. Nhóm cào lỗi ở lại, thử lại tối đa `runner.maxScrapeAttempts` lần. Bot theo dõi không bao giờ cào hay bấm trong giao diện Zalo; nó chỉ tắt và mở lại Zalo (giữ `data/.scrape.lock`) khi nối lại hoặc khi cổng debug không trả lời. Mọi thứ điều khiển giao diện Zalo dùng chung khóa `data/.scrape.lock` (`src/core/scrapeLock.ts`).

## Cấu hình

- Mặc định ở `config.ts`, KHÔNG chứa tên nhóm, người, trường hay đường dẫn riêng. Cấu hình thật ở `config.json` trong `ZBOT_HOME` (mặc định thư mục gốc repo; bản cài là `%LOCALAPPDATA%\BaoCaoNhom`), nạp đè lên mặc định lúc khởi động (`src/config/configFile.ts`). Mẫu: `config.example.json`.
- `src/config/configCheck.ts` từ chối giá trị sai bằng một dòng `[config] ...` và thoát mã 1; `targets` rỗng chỉ là cảnh báo. `src/config/configDoc.ts` mô tả từng khóa.
- Test không đọc `config.json` thật: chúng đọc `tests/fixtures/config.test.json` (qua `NODE_TEST_CONTEXT`).
- Bot đọc cấu hình lúc khởi động; đổi xong phải khởi động lại bot.
- Đường dẫn lấy từ `src/core/paths.ts` (`ZBOT_HOME` cho dữ liệu và cấu hình, `ZBOT_CODE_ROOT` cho mã). Chỉ file đó được đọc `import.meta.url`.

## Bản bán: những điều không được phá

- **Khóa riêng giấy phép không bao giờ vào repo, `dist/` hay gói cài.** Nó nằm ngoài repo; chỉ `src/cli/issue-license.ts` đọc nó và file đó không thuộc `dist`. `scripts/distCheck.mjs` quét `dist/` tìm khóa riêng; `.gitignore` chặn `*.pem`, `license-private*`, `/license.json`, `/config.json`.
  (Giấy phép hiện không bị bắt buộc, nhưng cặp khóa vẫn có thể được dùng lại, nên quy tắc này vẫn giữ.)
- Giấy phép **đang tắt**: `bot-watch-core`, `bot-dispatch`, `bot-scrape` không gọi `requireLicense()` và panel không hiện thẻ giấy phép. Mô-đun `src/core/licenseGate.ts` và `license.ts` còn nguyên để bật lại; test `tests/licenseGate.test.ts` ghi cách bật.
- `appId` `com.baocaonhom.app`, tên file chạy `bao-cao-nhom`, thư mục dữ liệu `BaoCaoNhom`, tên sản phẩm "Báo Cáo Nhóm" và kho phát hành `minesan191132/zca-scraping` đã nằm trong gói khách: không đổi.
- Không chạy `bot:watch` hay bot khác của hệ thống đầy đủ cùng lúc với bản cài trên một máy: cả hai cùng điều khiển một Zalo Desktop qua cổng 9222.
- Đây là repo công khai. Mọi tên trường, tên người, id bộ trong test và tài liệu là **tên giả**. Không thêm tên thật, đường dẫn máy thật, khóa hay dữ liệu cào được.

## Bố cục

Mọi thứ chạy được nằm dưới `src/` (xem README, mục "Cấu trúc dự án"): `cli/` (mỗi lệnh một file; `cli/debug/` là công cụ dò tay), `types/` (kiểu dùng chung, một cửa: `import type { Report } from "../types/index.js"`), `core/`, `config/`, `scrape/`, `watch/`, `runner/dispatch.ts`, `store/`, `export/`, `mcp/`, `definitions/`. `config.ts` ở gốc repo. Test ở `tests/`. Panel là dự án con `panel/` với `package.json`, eslint và vitest riêng; nó chỉ gọi các CLI, không import mã bot.

Quy ước:
- Import trong `src/` có đuôi `.js` (`"./cells.js"`), như các file xung quanh.
- Tên, mật độ và ngôn ngữ chú thích theo file đang sửa: đọc một file cạnh bên trước khi viết.
- Selector DOM của Zalo chỉ nằm ở `scrape/scrapeSelectors.ts`.
- Giá trị chỉnh được (giờ, ngưỡng, số lần thử) đặt trong `config.ts`, có mô tả trong `configDoc.ts` và kiểm trong `configCheck.ts`; không để số tùy ý trong module.
- Ghi file lúc chạy chỉ dưới `data/` qua `core/atomicWrite.ts`. Không ghi vào `src/`, `docs/` hay gốc repo.
- Không thêm phụ thuộc khi `package.json` đã có thứ làm được việc đó.
- Logic mới đi kèm test trong `tests/<tên>.test.ts`; đổi hành vi thì sửa test cũ, đừng xóa.

## Chỗ dễ vỡ (theo khả năng gặp, chi tiết ở README, "Bảo trì")

Selector DOM (`scrapeSelectors.ts`) trước: Zalo đổi giao diện thì số tin về 0 hoặc báo "sidebar item not found"; sửa bằng `npm run zalo:debug` rồi soi DOM qua `src/scrape/cdp.ts`. Kế đến `config.targets` lệch tên nhóm thật (không báo lỗi, chỉ là không theo dõi), định dạng `msgId`/timestamp khác nhau theo loại tin, rồi `zaloExePath` tự dò hỏng nếu Zalo đổi cách cài. `src/watch/realtimeListener.ts` là loại riêng: giao thức nhị phân chưa công bố, dò ngược (cmd/subCmd, AES-GCM + gzip), có thể đổi mà UI không có dấu hiệu gì. Nó là nguồn kích hoạt duy nhất của bot theo dõi; hỏng thì bot theo dõi mù (`npm run watch:status` báo) và tin sót phải vớt bằng `scrape:add` rồi cào tay.
