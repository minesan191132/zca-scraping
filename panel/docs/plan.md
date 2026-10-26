# Kế hoạch triển khai

Thiết kế ở `docs/design.md`. Người dùng đã giao quyền tự quyết từng bước, nên bảng model bên dưới là quyết định, không chờ duyệt. Kết quả của model rẻ được kiểm lại bằng lệnh trước khi dùng.

| # | Bước | Model | Giao / tại chỗ | Lệnh kiểm |
|---|---|---|---|---|
| 1 | Khung electron-vite + Tailwind 4 + shadcn-svelte + Vitest, commit đầu | sonnet | tại chỗ | `npm run typecheck` sạch |
| 2 | `shared`: kiểu IPC, danh sách bot, `settings-map`, `validation` thuần + test | sonnet | tại chỗ | `npm test` |
| 3 | `main`: status-parse, process-tree, bots, jobs, project, config-bridge, ipc, index + test | sonnet | tại chỗ | `npm test`, `npm run typecheck` |
| 4 | Dữ liệu chữ: chuyển `i18n.js`, `texts.js` sang TypeScript bằng script, kiểm đủ khóa | sonnet | tại chỗ (script) | `npm test` |
| 5 | Renderer nền: i18n, theme, font, store trạng thái và log, khung và thanh bên | sonnet | tại chỗ | `svelte-check` |
| 6 | Linh kiện ô nhập cấu hình (10 kiểu) và `SettingRow` | sonnet | giao subagent | `svelte-check`, ảnh chụp |
| 7 | Trang Tổng quan, trang bot, Tác vụ, Chung, chọn thư mục lần đầu | sonnet | tại chỗ | `svelte-check`, ảnh chụp |
| 8 | Đóng gói `--dir` rồi NSIS, chạy bản đã đóng gói | sonnet | tại chỗ | file `.exe` chạy được, ảnh chụp |
| 9 | Kiểm đối chiếu bản demo và rà soát | opus | advisor + tại chỗ | danh sách đối chiếu |

Tầng 3 (khó) chỉ có bước 9 vì cần nhìn toàn cục. Các bước còn lại có thiết kế rõ, một đến vài file, có lệnh kiểm.

Quy tắc chung: mỗi bước một commit trong repo này; không push; không bấm khởi động bot thật; không xóa `electron-demo/`.
