# Zalo Bots, bảng vận hành

App Windows (Electron) để xem trạng thái bốn bot của dự án `zca-scrape-message`, khởi động và dừng chúng, chạy các tác vụ làm tay, xem nhật ký và chỉnh cấu hình. App chỉ chạy các lệnh `npm run` của dự án bot, không import mã của bot.

Thư mục `zca-operations-panel` (repo git độc lập, ngoài repo bot) đã được gộp vào đây ngày 2026-10-15. Lịch sử chi tiết còn ở repo cũ; làm tiếp ở `panel/`.

Công nghệ: TypeScript, Svelte 5, electron-vite, Tailwind CSS 4, shadcn-svelte, Electron Builder. Thiết kế ở `docs/design.md`, kế hoạch ở `docs/plan.md`.

## Chạy

```bash
npm install
npm run dev          # chạy khi phát triển (tự tìm dự án bot ở thư mục cha)
npm test             # Vitest
npm run typecheck    # tsc (main, preload) và svelte-check (renderer)
npm run lint
npm run build:unpack # dist\win-unpacked\zalo-bots.exe
npm run build:win    # dist\zca-operations-panel-<phiên bản>-setup.exe (không ký số, SmartScreen sẽ cảnh báo lần đầu)
```

Thư mục này (`panel/`) nằm trong repo `zca-scrape-message`, và app tự tìm dự án bot, nên thường không phải chọn thư mục. Thứ tự tìm: biến môi trường `ZCA_PROJECT_DIR`, thư mục đã chọn và nhớ trước đó, rồi các thư mục cha của chỗ app đang nằm (mỗi cấp xét chính nó và thư mục anh em `zca-scrape-message`), rồi thư mục ghi lúc đóng gói (`resources/default-project.json`, do `scripts/write-default-project.mjs` ghi trước mỗi lần `build:*`). Chỉ khi cả bốn đều không thấy, app mới hỏi, và nhớ lựa chọn. Đổi lại ở trang Chung.

Vì vậy bản `distwin-unpacked` nằm trong repo mở thẳng vào tổng quan. File cài đặt (`setup.exe`) trên máy khác thì chỉ tìm được nếu thư mục ghi lúc đóng gói vẫn tồn tại ở máy đó, nếu không sẽ hỏi một lần.

Thư mục dự án phải định nghĩa các lệnh `bot:*`, `*:status`, `today`, `total:once` (thiếu thì app báo tên lệnh thiếu) và `config:dump` (thiếu thì chỉ tab Cấu hình không dùng được). `config:dump` có ở nhánh `feat/electron-gui-demo` của repo bot.

## Lưu cấu hình

Ở chế độ nguồn (chạy trong repo), nút Lưu ghi `settings.draft.json` trong thư mục dữ liệu người dùng; không bot nào đọc file này nên lưu không đổi cách bot chạy.

Ở bản cài (bản bán), nút Lưu ghi `config.json` trong `%LOCALAPPDATA%\BaoCaoNhom`, trộn với những gì đã có trong file, và bot đọc file này khi khởi động lại. Nếu bộ kiểm cấu hình từ chối giá trị, nút Lưu báo lỗi và không ghi. Chỉ các cài đặt mà bản bán thật sự đọc (`cdpPort`, `zaloExePath`, `targets`, `watch.*`, `runner.*`...) được hiện (`src/shared/bundled-settings.ts`).

## Kiểm thử giao diện bằng ảnh chụp

Biến môi trường `PANEL_STEPS` (JSON, danh sách `{js, shot}`) làm app chờ lần đọc trạng thái đầu tiên, chạy từng đoạn script trong trang rồi lưu ảnh chụp. `PANEL_USER_DATA` trỏ app tới một thư mục dữ liệu tạm, `PANEL_LOG` ghi lỗi của các bước.

## Dừng bot

Dừng một bot kill tiến trình của nó và các tiến trình con, trừ `Zalo.exe` (bot mở Zalo bằng `detached` nhưng Windows vẫn ghi bot là tiến trình cha, nên kill cả cây sẽ đóng luôn Zalo của người dùng).

## Gói triển khai (máy mới)

`npm run build:unpack` rồi `npm run kit -- --out D:/Kit` dựng một file zip ngoài thư mục dự án, gồm mã bot đã commit, app đã đóng gói, 10 mẫu Excel (thư mục `data/` của bot không nằm trong git nên phải chép riêng), `Cai-dat.cmd` và `HUONG-DAN.txt`. Gói không chứa `.env` thật, tin đã cào hay báo cáo đã xuất. Người nhận giải nén, chạy `Cai-dat.cmd` (kiểm tra Node 22, `npm install`, tạo `.env`, kiểm tra cấu hình, Zalo, Excel, tạo lối tắt), sửa `config.ts` rồi mở app. Nguồn của script và hướng dẫn nằm ở `kit/`, script dựng ở `scripts/make-kit.mjs`.

Gói dùng bản mã bot đã commit (mã commit ghi trong `VERSION.txt`), không dùng thay đổi chưa commit.

## Bản bán "Báo Cáo Nhóm"

`electron-builder.product.yml` dựng bản chỉ có panel và các CLI đã gộp (không `default-project.json`, không mã nguồn). Trước tiên chạy `npm run build:dist` ở thư mục gốc (tạo `../dist`), rồi trong `panel/`: `npm run build:product:unpack` (thư mục `dist-product/win-unpacked`, để kiểm) hoặc `npm run build:product` (file cài). `appId` `com.baocaonhom.app` và thư mục dữ liệu `%LOCALAPPDATA%\BaoCaoNhom` khó đổi sau khi có khách cài. Giấy phép: xem `src/core/license.ts` và `npm run license:issue` ở gốc; khóa công khai thật chưa đặt (còn chuỗi giữ chỗ).
