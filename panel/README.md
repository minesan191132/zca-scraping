# Báo Cáo Nhóm, panel điều khiển

App Windows (Electron) để nhập giấy phép, chỉnh cấu hình, bật và tắt hai bot (theo dõi tin, điều phối cào), xem trạng thái và nhật ký. App chỉ chạy các CLI của dự án bot, không import mã của bot.

Công nghệ: TypeScript, Svelte 5, electron-vite, Tailwind CSS 4, shadcn-svelte, Electron Builder, `electron-updater`. Thiết kế ở `docs/design.md`.

## Hai chế độ

- **Chế độ nguồn** (chạy trong repo): app tự tìm dự án bot ở thư mục cha và chạy các lệnh `npm run`. Hiện đủ tab và trang của hệ thống đầy đủ khi thư mục dự án có các lệnh tương ứng.
- **Bản cài** (bản bán): có thư mục `dist` (các CLI đã gộp) cạnh `resources`. App chạy chúng bằng chính `bao-cao-nhom.exe` ở chế độ Node. Dữ liệu và cấu hình ở `%LOCALAPPDATA%\BaoCaoNhom`. Chỉ hai bot, thẻ giấy phép và các cài đặt mà bản bán thật sự đọc.

## Chạy khi phát triển

```bash
npm install
npm run dev          # chạy khi phát triển (tự tìm dự án bot ở thư mục cha)
npm test             # Vitest
npm run typecheck    # tsc (main, preload) và svelte-check (renderer)
npm run lint
```

Thứ tự tìm thư mục dự án bot ở chế độ nguồn: biến môi trường `ZCA_PROJECT_DIR`, thư mục đã chọn và nhớ trước đó, rồi thư mục cha của `panel/`. Thư mục dự án phải định nghĩa các lệnh `bot:*` và `*:status` (thiếu thì app báo tên lệnh thiếu) và `config:dump` (thiếu thì chỉ tab Cấu hình không dùng được).

## Lưu cấu hình

Ở chế độ nguồn, nút Lưu ghi `settings.draft.json` trong thư mục dữ liệu người dùng; không bot nào đọc file này nên lưu không đổi cách bot chạy.

Ở bản cài, nút **Lưu cấu hình** ghi `config.json` trong `%LOCALAPPDATA%\BaoCaoNhom`, trộn với những gì đã có trong file, và bot đọc file này khi khởi động lại. Nếu bộ kiểm cấu hình từ chối giá trị, nút Lưu báo lỗi và không ghi. Chỉ các cài đặt mà bản bán thật sự đọc (`cdpPort`, `zaloExePath`, `targets`, `watch.*`, `runner.*`...) được hiện (`src/shared/bundled-settings.ts`).

## Giấy phép

Thẻ Giấy phép hiện trạng thái, mã máy (có nút chép) và nút nhập file giấy phép. Nhập file bị từ chối thì giấy phép đang dùng được giữ nguyên. Cách kiểm và cách cấp: `docs/van-hanh-ban-ban.md` ở gốc repo.

## Cập nhật tự động

Bản cài kiểm bản mới lúc khởi động và mỗi 6 giờ qua GitHub Releases (`electron-updater`), tải ngầm, và chỉ cài ở lần kiểm đầu sau khi mở app, khi không có bot, tác vụ hay `data\.scrape.lock` nào đang chạy (`src/main/updater.ts`). Không bao giờ cài lúc thoát. Bản không có `app-update.yml` (bản `win-unpacked`, chế độ nguồn) tắt phần này im lặng.

## Dừng bot

Dừng một bot kill tiến trình của nó và các tiến trình con, trừ `Zalo.exe` (bot mở Zalo bằng `detached` nhưng Windows vẫn ghi bot là tiến trình cha, nên kill cả cây sẽ đóng luôn Zalo của người dùng). Đóng app cũng dừng các bot do chính app đã bật.

## Kiểm thử giao diện bằng ảnh chụp

Biến môi trường `PANEL_STEPS` (JSON, danh sách `{js, shot}`) làm app chờ lần đọc trạng thái đầu tiên, chạy từng đoạn script trong trang rồi lưu ảnh chụp. `PANEL_USER_DATA` trỏ app tới một thư mục dữ liệu tạm, `PANEL_LOG` ghi lỗi của các bước.

## Dựng bản bán

`electron-builder.product.yml` dựng bản chỉ có panel và các CLI đã gộp (không `default-project.json`, không mã nguồn). Trước tiên chạy `npm run build:dist` ở thư mục gốc (tạo `../dist`), rồi trong `panel/`:

```bash
npm run build:product:unpack   # panel/dist-product/win-unpacked, để kiểm, không cài
npm run build:product          # file cài NSIS + latest.yml
```

`appId` `com.baocaonhom.app` và thư mục dữ liệu `%LOCALAPPDATA%\BaoCaoNhom` khó đổi sau khi có khách cài. Phát hành bản mới lên GitHub: `docs/van-hanh-ban-ban.md`.

`electron-builder.yml` và các script `build:unpack`, `build:win`, `kit` là của bản đầy đủ (gói triển khai kèm mã bot); bản bán không dùng chúng.
