# Bản bán cho người khác: bộ bot cào Zalo, không kèm báo cáo hiện tại

Ngày 2026-10-24. Trạng thái: nháp, chờ người dùng duyệt. Chưa viết code.

> **Đã bị bổ sung (2026-10-24, sau tài liệu này):** `2026-10-24-bao-cao-dinh-nghia-bang-du-lieu-design.md` thêm bộ máy báo cáo do khách tự định nghĩa. Các mục của tài liệu này bị nó thay: "Phạm vi đã chốt" (câu cuối), "Không làm" (dòng đầu), "Điều làm việc này thất bại" (dòng cuối), "bộ điều phối mỏng", bước "Cách ly bản bán", quyết định 1, 2 và 8. Đọc hai tài liệu cùng nhau; chỗ nào lệch thì tài liệu kia thắng.

## Phạm vi đã chốt

Người dùng nói: bản bán KHÔNG kèm các báo cáo hiện tại; khách chỉ nhận giải pháp, tức là các con bot cào dữ liệu. Hệ quả: các báo cáo của tổ chức hiện tại (parser của chúng, file Excel mẫu, file tổng, danh sách nhân viên, nghỉ phép, biên bản, đồng bộ CSDL) ở lại máy tác giả và không đi vào bản cài. Phần thêm sau đó: bản bán có một bộ máy chung để khách tự định nghĩa báo cáo của họ (xem tài liệu bổ sung); bộ máy dùng lại một phần mã hiện có, nhưng không mang dữ liệu của tổ chức hiện tại.

## Vì sao làm

Hệ thống hiện chạy trên một máy do tác giả dựng và sửa. Tác giả muốn đưa phần cào Zalo cho người khác: họ cài, khai báo nhóm Zalo muốn theo dõi, và nhận dữ liệu tin nhắn về máy họ mà không cần tác giả ngồi cạnh. Người dùng chưa rõ khách là ai.

## Mục tiêu, không mục tiêu

Mục tiêu:
- Cài bằng một file setup trên máy Windows sạch (không Node, không Git).
- Khách khai báo nhóm Zalo trong giao diện, bot chạy và lưu tin vào máy khách.
- Cấu hình và dữ liệu nằm ngoài thư mục cài, cập nhật không xóa chúng.
- Khi Zalo đổi giao diện làm hỏng bot, tác giả đẩy bản sửa tới mọi khách.

Không làm:
- Định nghĩa, mẫu Excel, file tổng và danh sách của tổ chức hiện tại; các báo cáo mức 3 (`maintenance`, `internetSpeed`, `leave`, `minutes`, `attendance`); `src/master/`, `src/vision/`, `src/ocr/`, `src/total/`, `sync:db`. Mã chung của bộ máy báo cáo (lớp điền Excel `FileFillSpec` và `fill-status-template.ps1`, bộ đổi giá trị của `techReport.ts`, `splitLabel`/`fold`, `spelling.ts`, đăng ký báo cáo) thì ĐƯỢC mang theo, vì bộ máy mới dùng lại.
- Hệ thống thu tiền, trang web bán hàng, macOS/Linux.

Điều làm việc này thất bại dù chạy được:
- Bản cài ghi dữ liệu hoặc cấu hình vào thư mục cài (mỗi lần cập nhật thay cả thư mục đó).
- Giá trị riêng của tác giả (nhóm, đường dẫn) nằm trong mặc định của mã bán ra.
- Bản bán còn mang theo định nghĩa, mẫu, file tổng hay danh sách tên của tổ chức hiện tại. (Mã bộ máy chung thì được.)

## Rủi ro nói một lần

Sản phẩm gắn vào Zalo Desktop qua CDP và giải mã WebSocket của Zalo. Bán thứ này có rủi ro vi phạm điều khoản Zalo. Mỗi lần Zalo đổi giao diện hay giao thức (`scrapeSelectors.ts`, `realtimeListener.ts`) mọi khách hỏng cùng lúc, nên kênh cập nhật là yêu cầu, không phải phần thêm. Không chặn thiết kế, nhưng cần cân nhắc trước khi bỏ tiền.

## Hiện trạng đã đọc (2026-10-24)

Phần lõi cào tách khá sạch khỏi nghiệp vụ:
- `src/scrape/`, `src/store/`, `src/core/`, `src/export/`, `src/mcp/` gần như không import module báo cáo. Chỉ có hai chỗ: `src/scrape/` import `stripDiacritics` (`lesson/parseReport.js`) và `vietnamDay` (`lesson/time.js`). Hai hàm nhỏ này cần chuyển sang chỗ dùng chung.
- `src/watch/watch.ts` import `chat/` (hộp thư chat, luồng phân tin) và `vision/groups.js`. Hộp thư chat là việc của `bot:chat`; `visionGroups` là việc đọc ảnh. Nếu bản bán không có chat và đọc ảnh thì hai chỗ này phải thành tùy chọn hoặc bỏ khỏi bản bán.
- `bot:scrape` (`src/cli/bot-scrape.ts`) chỉ cần `desktopScraper`, `queueRun`, `scrapeQueue`, `scrapeLock`, `messageStore`: đủ để chạy độc lập.
- `bot:runner` là bộ điều phối của báo cáo hiện tại (cào hàng chờ, sync DB, dựng báo cáo). Bản bán cần một bộ điều phối mỏng riêng: hàng chờ yên lặng thì cào, rồi chạy các định nghĩa báo cáo của khách trên tin mới (bước sau là thêm bởi tài liệu bổ sung). Đây là phần viết mới.
- Bot chạy bằng `tsx src/...` qua `npm run`; panel Electron (`panel/src/main/bots.ts`) gọi `cmd.exe /c npm run -s <script>`. Máy khách không có Node/npm/tsx. `panel/electron-builder.yml` chỉ đóng gói panel (NSIS, theo người dùng, không `perMachine`), mã bot không được đóng gói.
- `src/core/paths.ts`: `outputDir`, `scriptsDir`, `chatRulesPath`, `photoRulesDir` tính từ vị trí dự án; `dataDir` lấy từ `config.dataDir`.
- `config.ts` là TypeScript chạy lúc import (`todayAt()`, `findZaloExe()`); 66 module import nó. `config:dump` đã in cấu hình dạng JSON kèm mô tả, panel đã dùng làm form. Panel hiện lưu bản nháp vào `settings.draft.json` mà không bot nào đọc (`panel/src/main/config-bridge.ts`).
- Đầu ra dữ liệu có sẵn cho khách: kho JSON `data/<groupId>.json` (khử trùng theo `msgId`), xuất Excel tạm thời một luồng (`export:excel`, `src/export/exportExcel.ts`), và máy chủ MCP chỉ đọc (`src/mcp/server.ts`).

## Thiết kế đề xuất

### Cái gì vào bản bán

Lõi: `bot:watch` (phát hiện tin mới), bộ điều phối cào mỏng (mới), `bot:scrape` (cào tay), kho JSON, xuất Excel, MCP, panel. Đây là cách tôi hiểu "con bot cào dữ liệu"; cần người dùng xác nhận (câu hỏi 1).

### Tách lõi khỏi nghiệp vụ

1. Chuyển `stripDiacritics`, `vietnamDay` sang `src/core/` (hoặc nơi dùng chung), `lesson/` import ngược từ đó; hành vi không đổi, test hiện có chạy lại.
2. Làm cho `watch.ts` không phụ thuộc cứng vào `chat/` và `vision/`: hai chỗ đó thành cắm thêm được (hàm móc truyền vào lúc khởi động). Máy tác giả truyền vào như cũ; bản bán không truyền.
3. Cách ly bản bán bằng đường dẫn xây dựng: bản bán chỉ biên dịch từ các điểm vào của lõi (`bot-watch`, bộ điều phối, `bot-scrape`, `export-excel`, `mcp`, và điểm vào của bộ máy báo cáo). Mã báo cáo riêng của tổ chức hiện tại không có trong gói là cách chắc nhất để không lộ.

### Đóng gói

1. **Chạy không cần Node.** Gộp các điểm vào của lõi thành JS bằng esbuild và kèm `node.exe` trong resources; panel gọi `node.exe dist/cli/<tên>.js`. Các chỗ tự spawn tiến trình con (runner dùng `node --import tsx src/cli/<x>.ts` trong `src/runner/steps.ts`; `srcDir` trong `paths.ts`) phải trỏ vào `dist/`, nếu không bộ điều phối đã cài chết ngay bước đầu. Lựa chọn này dựa trên giả định của tôi là khách không được đọc mã nguồn; JS gộp vẫn đọc được, mức bảo vệ mạnh hơn phụ thuộc câu hỏi 2.
2. **Thư mục chỉ đọc và ghi được.** Chỉ đọc (cạnh file cài): mã bot, `scripts/` còn dùng. Ghi được (`%LOCALAPPDATA%\<tên sản phẩm>\`): `data/`, `output/`, `config.json`, nhật ký, file khóa. Mọi đường dẫn đi qua `src/core/paths.ts`; thêm gốc dữ liệu đọc từ biến môi trường do panel đặt, mặc định là hành vi cũ khi chạy từ mã nguồn.
3. **Cấu hình là dữ liệu.** `config.json` ở thư mục ghi được. `config.ts` thành lớp nạp: đọc JSON, trộn mặc định, trả cùng đối tượng `config`, để 66 module không đổi dòng import. `todayAt` và `findZaloExe` chuyển thành bước tính lúc nạp. `configCheck.ts` vẫn kiểm tra; `config:dump` là đường nối với panel, và panel ghi thẳng `config.json` thay cho `settings.draft.json`.
4. **Thiết lập lần đầu trong panel.** Kiểm tra Zalo Desktop có trên máy, dò đường dẫn Zalo, nhập danh sách nhóm (`targets`), chọn thư mục dữ liệu, bật/tắt xuất Excel.
5. **Giấy phép và cập nhật.** Giấy phép: khóa gắn máy, kiểm tra lúc panel mở và lúc bot khởi động, cho ngoại tuyến vài ngày; cơ chế cụ thể để người xây chọn. Cập nhật: `electron-updater` từ một kho do tác giả nắm, không bao giờ ghi đè thư mục ghi được.

### Máy tác giả

Vẫn chạy từ mã nguồn, không đổi cách vận hành. Giá trị riêng (`targets`, bộ "NguoiA", `dataDir`) dời vào `config.json` cục bộ trong `.gitignore`, cùng lớp nạp đọc; mặc định trong `config.ts` thành rỗng cho mọi người.

### Tiêu chí xong

Máy Windows sạch có Zalo Desktop: cài bằng file setup, panel dẫn qua thiết lập, `bot:watch` và bộ điều phối chạy, tin mới của nhóm đã khai báo xuất hiện trong `data/<groupId>.json` và `export:excel` ra file. Đối chiếu: cùng một nhóm cào trên bản cài và trên mã nguồn cho ra cùng danh sách `msgId`. Trên máy tác giả, `npm test` và `npm run typecheck` vẫn qua sau khi tách.

## Quyết định của tôi (người dùng chưa nói, kiểm lại)

1. Chỉ Windows; khách tự có Zalo Desktop đã đăng nhập và Excel có bản quyền (ĐÃ ĐỔI 2026-10-24: điền mẫu đi qua Excel COM, xem `2026-10-24-bao-cao-dinh-nghia-bang-du-lieu-design.md`).
2. Không có `sync:db`, đọc ảnh, in, và không kèm các báo cáo hiện tại trong bản bán. Khách tự định nghĩa báo cáo của họ bằng bộ máy trong tài liệu trên.
3. Cài theo người dùng (không cần quyền admin), giữ như hiện nay.
4. Cập nhật cài ở lần mở panel kế tiếp, không ép cài khi bot đang chạy. Bản vá khẩn là bước sau, cần dừng bot an toàn (chờ `data/.scrape.lock`).
5. Bộ điều phối mỏng là phần viết mới; không dùng lại `bot:runner`.
6. Máy tác giả chạy từ mã nguồn.

7. Không kèm `bot:chat` (gửi tin từ tài khoản của khách, rủi ro điều khoản cao hơn nhiều; thị trường đã có bot trả lời Zalo miễn phí như Tino AI). Thêm sau nếu có khách đòi.
8. ĐÃ ĐỔI 2026-10-24: có công cụ định nghĩa báo cáo, vì người dùng muốn người không biết code tự thay báo cáo (xem `2026-10-24-bao-cao-dinh-nghia-bang-du-lieu-design.md`). Khách vẫn nhận kho JSON, `export:excel` một luồng và MCP.
9. Bảo vệ mã nguồn mức gộp và nén JS. Các file `scripts/*.ps1` còn dùng sẽ đọc được. Mạnh hơn thì quy trình đóng gói đổi.

Ba mục 7-9 là mặc định tôi chọn vì người dùng chưa trả lời; đổi mục nào thì sửa tài liệu ở mục đó.

## Quyết định sản phẩm do advisor đưa (2026-10-24, người dùng ủy quyền)

Ba việc này người dùng giao cho advisor. Đều là mặc định đổi được; chỗ nào khó đổi về sau ghi rõ.

1. **Tên.** Không đưa "Zalo" và tên nội bộ vào tên sản phẩm, `appId` hay tên file chạy: tên bên thứ ba trong sản phẩm có thu tiền dễ bị coi là liên kết hoặc bị yêu cầu gỡ, và kéo thêm chú ý về điều khoản Zalo đã nêu ở mục rủi ro; tên nội bộ tránh câu hỏi mẫu Excel thuộc về ai. Tên hiển thị tạm: **Báo Cáo Nhóm** (đổi được ở mỗi bản phát hành). `appId`: `com.baocaonhom.app`, `executableName`: `bao-cao-nhom`, thư mục dữ liệu: `%LOCALAPPDATA%\BaoCaoNhom`. Không có chữ "Beta" trong ba giá trị này để bản đầy đủ giữ nguyên. KHÓ ĐỔI VỀ SAU: `appId` (đổi thì bản mới cài cạnh bản cũ, không nâng cấp tại chỗ) và tên thư mục dữ liệu (đổi thì dữ liệu khách mồ côi). Cả hai đổi tự do cho tới khi có khách đầu tiên cài. Tên chỉ nằm ở panel (`electron-builder.yml` và một hằng số cho thư mục dữ liệu); các bot chỉ đọc `ZBOT_HOME`.
2. **Giấy phép: file ký số, kiểm tra ngoại tuyến, không máy chủ.** Ed25519 bằng `node:crypto` (không thêm phụ thuộc). File `{ "payload": "<chuỗi JSON>", "sig": "<base64>" }`, chữ ký phủ đúng các byte của `payload` (không phải chuẩn hóa JSON). Payload: `customer`, `machineId`, `issuedAt`, `expiresAt`. Giấy phép Beta hạn 90 ngày, gia hạn bằng cách gửi file mới. `machineId` là `MachineGuid` trong `HKLM\SOFTWARE\Microsoft\Cryptography` (đã kiểm: nhóm `BUILTIN\Users` có quyền `ReadKey`, nên đọc được không cần quyền quản trị). Khóa công khai nhúng trong mã; khóa riêng không bao giờ vào repo nào hay bộ cài, để ngoài hai repo. Bot đã gộp từ chối chạy khi thiếu, hết hạn hoặc sai giấy phép, báo rõ lý do; `config-dump` vẫn chạy để dựng form. File giấy phép nằm ở `ZBOT_HOME`. Nói thật với người dùng: phép kiểm nằm trong JS đọc được, chỉ chặn sao chép tùy tiện, không chặn người quyết tâm; khớp mức bảo vệ "gộp và nén" đã chọn.
3. **Cập nhật: `electron-updater` với GitHub Releases ở một repo riêng, công khai, chỉ chứa bản phát hành.** Repo chỉ có file cài và `latest.yml`, không mã nguồn, không chữ nào nói về Zalo; repo nguồn giữ riêng và kín. Tải không cần token (loại bỏ repo kín vì phải nhúng token vào mọi bản cài). Bản mới cài ở lần mở panel kế tiếp, không bao giờ lúc bot đang chạy hay `scrape.lock` đang giữ (quyết định 4). KHÓ ĐỔI VỀ SAU: địa chỉ cập nhật được nhúng trong từng bản dựng; đổi nơi chứa thì phải phát hành một bản cuối ở nơi cũ trỏ sang nơi mới. Tạo repo và phát hành là việc hướng ra ngoài: kế hoạch không tự tạo hay đẩy; người dùng làm, hoặc xác nhận trước. Bản cài không ký số hiện cảnh báo SmartScreen "nhà phát hành không rõ"; chấp nhận cho Beta. Phải kiểm `electron-updater` chạy được khi không ký (không đặt `publisherName`) trước khi hứa.

## Việc để người xây quyết định

- Công cụ gộp (esbuild hay tương đương) và xử lý phụ thuộc có phần gốc (`xlsx`, `mssql` nếu còn).
- Cơ chế giấy phép và máy chủ kiểm tra; tên sản phẩm và thư mục dữ liệu.
- Hình dạng hàm móc cho `chat/` và `vision/` trong `watch.ts`.
- Thứ tự: tách lõi (đổi chỗ hai hàm, hàm móc) → đường dẫn → cấu hình JSON → bộ điều phối mỏng → đóng gói chạy không Node → thiết lập lần đầu → giấy phép/cập nhật.

## Quy tắc dự án áp vào việc này

Việc phức tạp theo Rule 2 (đụng `config.ts`, `package.json`, `paths.ts`, nhiều module, đường chạy của bot sống). Kế hoạch triển khai phải qua advisor trước khi làm; nếu chia subagent thì theo Rule 4 (mỗi phần một worktree, file dùng chung chỉ agent chính sửa).
