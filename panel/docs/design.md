# Bảng vận hành zca: thiết kế

Ngày 2026-10-15. Thay cho `electron-demo/` (HTML, CSS, JS thuần) trong repo `zca-scrape-message`.

## Mục tiêu

Một app Windows để người vận hành xem trạng thái bốn bot (watch, runner, chat, total), khởi động và dừng chúng, chạy các tác vụ hay làm tay, xem log và chỉnh cấu hình. App nằm ngoài repo bot và chỉ nói chuyện với bot qua lệnh `npm run`. Giai đoạn này làm cho bằng bản demo về chức năng, đổi bố cục theo từng bot, chưa thêm tính năng mới.

Công nghệ: TypeScript, Svelte 5, electron-vite, Tailwind CSS 4, shadcn-svelte (style vega), Electron Builder.

## Quyết định đã chốt

| Việc | Chọn | Lý do |
|---|---|---|
| Vị trí | `<repo>\panel`, repo git riêng | Tách hẳn khỏi lịch sử bot. Thư mục này nằm trong `.git/info/exclude` của repo cha. |
| Tìm dự án bot | Hỏi lần đầu, nhớ trong `userData`, đổi được ở trang Chung | File cài đặt không còn đường dẫn tương đối tới bot. |
| Bố cục | Theo từng bot, mỗi bot ba tab: Trạng thái, Nhật ký, Cấu hình | Mọi thứ về một bot nằm một chỗ. |
| Dựng renderer | Svelte 5 thuần, chuyển trang bằng state | Chỉ có khoảng 7 trang, SvelteKit thừa. |
| Xác nhận | Hộp thoại shadcn trong renderer | Main không cần biết ngôn ngữ, hộp thoại theo theme. |
| Lưu cấu hình | Vẫn là bản thử, ghi vào `userData/settings.draft.json` | Ghi thật vào `config.ts` là việc riêng, cần thiết kế riêng. |
| Dọn `electron-demo/` | Giữ lại tới khi người dùng thử xong app mới | Để đối chiếu. |

## Ranh giới

```
src/main      chạy lệnh bot, đọc trạng thái, cầu nối cấu hình, nhớ thư mục dự án
src/preload   cầu IPC có kiểu
src/shared    kiểu IPC, danh sách bot, bảng khóa cấu hình thuộc trang nào
src/renderer  Svelte: trang, linh kiện, i18n, theme
tests         Vitest cho logic thuần
```

- Lệnh app được phép chạy nằm cố định ở `src/shared/bots.ts`. Renderer chỉ gửi mã bot hoặc mã tác vụ, không gửi chuỗi lệnh.
- `contextIsolation` bật, `nodeIntegration` tắt, CSP chặt (`default-src 'self'`).
- Bot cung cấp ba nhóm lệnh: `bot:*`, `*:status` và `config:dump` (chỉ đọc, thêm vào repo bot ở commit `9a17b83`).
- Thư mục dự án hợp lệ khi `package.json` có đủ `bot:watch`, bốn lệnh `*:status` và `config:dump`. Thiếu riêng `config:dump` (ví dụ bot đang ở nhánh cũ) thì các trang bot và tác vụ vẫn chạy, còn tab cấu hình nói rõ thiếu lệnh nào.

## Trang

Thanh bên: Tổng quan, bốn bot, Tác vụ, Chung, kèm nút theme, nút VI/EN và tên thư mục dự án.

- **Tổng quan:** bốn ô số liệu và bốn thẻ bot. Bấm thẻ thì mở trang bot.
- **Trang bot:** tab Trạng thái (huy hiệu, một câu mô tả, Khởi động, Dừng, "Chi tiết" giữ chữ gốc), tab Nhật ký (chỉ log của bot đó, giữ 3.000 dòng, hiện 1.000), tab Cấu hình (mục của bot, chia nhóm nhỏ).
- **Tác vụ:** bốn nút và nhật ký của tác vụ.
- **Chung:** bốn tab (Zalo và lưu trữ, Nhóm và người phụ trách, Cào tin, Đọc ảnh) và ô đổi thư mục dự án.

Chia 73 mục cấu hình theo tiền tố khóa: `watch.*` (6) về watch; `runner.*`, `recovery.*`, `sessions.*`, `phases.*` (18) về runner; `chat.*` (6) về chat; `total.*`, `print.*` (11) về total; năm khóa Zalo và lưu trữ, bốn khóa nhóm và người, bốn khóa cào tin, `vision.*` (19) về Chung. Khóa được nhiều bot đọc nằm ở trang chủ sở hữu và có dòng "cũng dùng bởi". Hàm chia nằm ở `src/shared/settings-map.ts` và có test kiểm tổng 73, không khóa nào thiếu hay trùng.

## Trạng thái bot

Dòng đầu của lệnh status quyết định trạng thái, không dùng mã thoát (`watch:status` thoát 0 cả khi bot đã dừng). Dòng đầu là dòng có dạng `[watch]`, `[runner]`, `[chat]` hoặc `[total]`, bỏ qua cảnh báo npm đứng trước.

| Dòng đầu chứa | state | kind |
|---|---|---|
| `ĐÃ DỪNG` | stopped | stopped |
| `CÓ VẺ ĐÃ CHẾT` | dead | dead |
| `chưa từng chạy` hoặc `chưa có dữ liệu` | dead | never |
| `ĐANG CHẠY NHƯNG MÙ` | warn | blind |
| `LỖI` kèm pid | warn | error |
| `ĐANG CHẠY` | alive | running (kèm `since`, `dry`) |
| không rơi vào mục nào, hoặc rỗng | dead | unknown |

Một bot do app vừa khởi động (dưới 180 giây) mà status vẫn báo stopped hoặc dead thì hiện "Đang khởi động". Poll trạng thái mỗi 10 giây, sau Khởi động hoặc Dừng 4 giây poll lại.

## Dừng bot

Bản demo dùng `taskkill /T`, và vì Zalo được bot mở bằng `detached` nhưng vẫn có ParentProcessId là tiến trình bot, nó đóng luôn Zalo của người dùng. Bản mới liệt kê cây tiến trình con bằng CIM (`Win32_Process`), loại `Zalo.exe`, rồi kill phần còn lại. Hàm chọn đích là hàm thuần, test với bảng tiến trình giả.

## Ngôn ngữ, theme, font

- Chữ giao diện ở `src/renderer/src/lib/i18n/{vi,en}.ts`. `en` khai báo `satisfies Record<keyof typeof vi, string>` nên thiếu khóa là lỗi biên dịch. Tiếng Việt viết thuần Việt, thuật ngữ trong ngoặc ngay sau từ Việt. Lựa chọn nhớ trong `localStorage`.
- Tên và giải thích 73 mục cấu hình (từ `texts.js` của bản demo) chuyển sang `settingTexts.ts`, có test đủ 73 khóa cho cả hai ngôn ngữ.
- Theme: lớp `dark` trên `<html>` theo quy ước shadcn, nhớ trong `localStorage`, áp dụng trước lần vẽ đầu, báo cho main để `nativeTheme.themeSource` và màu nền cửa sổ khớp. Cửa sổ chỉ hiện ở `ready-to-show`.
- Font: Be Vietnam Pro qua `@fontsource/be-vietnam-pro`, nhập từng bộ latin, latin-ext và vietnamese cho các độ đậm 400, 500, 600 và 700. Consolas cho log và mã.

## Đóng gói

Electron Builder, NSIS cài theo người dùng, `appId` `com.example.operations-panel`, không ký số (SmartScreen sẽ cảnh báo lần đầu). Kiểm bằng `--dir` trước, rồi cài đặt đầy đủ. Hai biến môi trường phục vụ kiểm thử: `ZCA_PROJECT_DIR` bỏ qua bước chọn thư mục, `PANEL_STEPS` chạy một kịch bản chụp ảnh nhiều bước.

## Kiểm thử

Vitest cho: đọc trạng thái (đưa nguyên các kết quả thật của bốn lệnh status và các dạng mù, lỗi, cảnh báo npm), chọn tiến trình để kill, chia 73 mục, kiểm tra giá trị cấu hình (cổng, đường dẫn tuyệt đối, `deadAfter` ít nhất gấp hai nhịp tim, `settleSeconds` nhỏ hơn `quietSeconds`, trùng nhóm, nhóm bỏ qua và nhóm thử phải nằm trong danh sách theo dõi, tên người), đủ khóa chữ. `svelte-check` và `tsc` phải sạch. Giao diện kiểm bằng ảnh chụp bốn tổ hợp sáng/tối × Việt/Anh.

## Danh sách đối chiếu với bản demo

Trạng thái đủ tám loại và cảnh báo npm; cửa sổ khởi động 180 giây; log 3.000/1.000 dòng, xóa mã ANSI, tô màu dòng lỗi và cảnh báo; mười kiểu ô nhập và gợi ý tên nhóm; mọi luật kiểm tra giá trị; huy hiệu chưa lưu và khác mặc định; hoàn tác từng dòng, về mặc định, hoàn tác tất cả; hộp thoại cần khởi động lại bot nào; tìm kiếm bỏ dấu; dịch nhãn mặc định và đơn vị; `zaloExePath` rỗng nghĩa là tự dò; tác vụ dừng ở bước lỗi đầu tiên; đóng app chỉ kill bot do app mở; một cửa sổ duy nhất.
