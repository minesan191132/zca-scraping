# Báo cáo định nghĩa bằng dữ liệu, để người không biết code tự thay

Ngày 2026-10-24. Trạng thái: nháp, chưa triển khai. Nguồn chính của thiết kế bản Beta; bản sao ở `<repo gốc>` đã cũ. Bổ sung cho `2026-10-24-ban-cai-dat-ban-cho-nguoi-khac-design.md` và thay hai quyết định của nó (xem cuối).

## Câu hỏi và kết luận

Câu hỏi: hệ thống cần đổi gì để chạy được nhiều loại báo cáo khác nhau, và để người không biết code tự thay báo cáo?

Kết luận: phần lớn báo cáo làm được không cần code, nhưng không phải tất cả. Hiện tại thêm một báo cáo mới cần sửa mã ở nhiều chỗ. Ba tầng làm nên một báo cáo; tầng cuối đã là dữ liệu, hai tầng đầu đang là mã và có thể chuyển thành dữ liệu. Có 4 báo cáo (xem bảng) nên để là mã cắm thêm, không ép thành dữ liệu.

## Ba tầng của một báo cáo hôm nay

1. **Nhận ra tin.** Mỗi loại có tiêu đề (cùng các cách gõ sai) và đôi khi thêm điều kiện: ví dụ `classifyTitle` (`src/lesson/parseReport.ts`) chỉ coi "BÁO CÁO CUỐI BUỔI" là của trường khi tin có dòng "Tên Giáo viên", để khỏi lẫn với form cũ của IT. Tiêu đề nằm sẵn trong `src/constants/reportTitles.ts`, cách gõ sai trong `spellingAliases.ts`, nhưng việc so khớp nằm trong mã.
2. **Đọc trường.** Mỗi báo cáo có một hàm đọc nhãn "Nhãn: giá trị" rồi đặt vào cột. Ví dụ `parseTechRow` trong `src/lesson/techReport.ts`: mỗi dòng của hàm là một cột, một nhãn, một bộ đổi giá trị. Các bộ đổi giá trị dùng lại được: giữ chữ, số hoặc chữ ("51 máy" thành 51), danh sách gạch đầu dòng, "PM2" thành 2, số đứng đầu, giờ ("9h30" thành phần ngày), tốc độ mạng về Mbps.
3. **Ghi Excel.** Đã là dữ liệu: `FileFillSpec` (mẫu, sheet, dòng đầu, dòng TỔNG, cột cuối, ô tiêu đề, công thức chú giải, các dòng) đi thành JSON vào `scripts/fill-status-template.ps1`, nó chèn hoặc xóa dòng rồi ghi giá trị qua Excel COM. Chỗ khó cho người không biết code: `firstDataRow`, `totalRowBefore` và các độ lệch khối chú giải (`legend.gradeRowOffsets`, `sumRowOffset`) hôm nay do người viết code đo tay trên từng mẫu (`src/lesson/statusReportLayout.ts`), và `legendFormulaCells` viết lại công thức COUNTIF theo vùng dữ liệu vì Excel tự co giãn sai.

## Phải đổi gì

### A. Định nghĩa báo cáo là một file dữ liệu

Mỗi báo cáo một file JSON trong một thư mục định nghĩa (tiền lệ: `photo-rules/*.json`). Một định nghĩa gồm:
- **Nhận tin:** tiêu đề và các cách gõ khác; nhãn bắt buộc phải có (thay cho luật "Tên Giáo viên"); nhóm Zalo áp dụng.
- **Trường:** danh sách {nhãn và các cách gõ khác, cột đích, bộ đổi giá trị chọn trong một danh sách cố định}. Danh sách cố định là các bộ đổi giá trị ở trên; thêm bộ mới là việc của người lập trình, không phải người dùng.
- **Kiểu dòng**, chọn một trong một menu nhỏ cố định: một tin một dòng; tách một trường thành nhiều dòng; giữ tin mới nhất theo khóa (ví dụ theo phòng); ánh xạ giá trị (chữ thành T/B/K); khung giờ trong ngày có mốc cắt (ví dụ đến 08:30).
- **Mẫu Excel:** tệp, sheet, và cách người dùng chỉ vị trí (xem B).

- **Tin gần khớp:** tin đúng tiêu đề nhưng thiếu một nhãn bắt buộc không bị bỏ và không ghi lặng lẽ ô trống; nó vào một file "cần xem" của báo cáo đó, panel hiển thị, người dùng sửa được rồi chạy lại. Hôm nay đó là việc của `FIELD_KEYS`, nhánh `gan_giong` và `overrides.json`; không có chỗ này thì bậc 2 không khớp được các báo cáo giai đoạn, và rủi ro "nhãn mới chưa thấy" (cuối tài liệu) không có chỗ rơi vào.

Cái đó làm được cho các báo cáo trong bảng bên dưới. Những gì nó không mô tả được thì giữ là mã cắm thêm.

### B. Bớt việc đo tay trên mẫu

Hướng cần kiểm chứng trước khi hứa: người làm mẫu gõ các dấu thay thế (ví dụ `{{ten_truong}}`) ở dòng dữ liệu đầu tiên; công cụ tự tìm vị trí dòng đầu, cột, dòng TỔNG, và khối chú giải. Cần xác nhận hai điều trong `fill-status-template.ps1` và các mẫu: (1) bảng Excel (ListObject) trong mẫu có tự co giãn dòng và tự đếm COUNTIF không; hiện script chèn/xóa dòng bằng tay và viết lại công thức, không dùng ListObject, nên chưa thể coi đây là có sẵn; (2) khối chú giải cạnh bảng có tự nhận ra được không. Nếu không, người dùng vẫn phải chỉ vị trí qua giao diện (nhấp ô), không gõ số dòng.

### C. Bỏ chỗ "danh sách báo cáo biên dịch cứng"

`ReportKey` là một kiểu liệt kê cố định (`REPORT_KEYS as const`, `Record<ReportKey, ReportDef>` trong `src/reportSets/registry.ts`). Định nghĩa nạp lúc chạy thì mã báo cáo thành chuỗi, kiểm tra lúc chạy. Cỡ việc: các từ khóa `ReportKey`, `REPORT_KEYS`, `REPORT_DEFS` xuất hiện 97 lần ở 21 file: 17 file ở `src` và 4 file ở `tests`; `panel/src` không có lần nào. Đó là phép đổi cơ học nhưng rộng, và cần giữ nguyên hành vi báo cáo hiện có.

### D. Tách khỏi khái niệm "ngày học"

`ReportKind "phase"|"day"`, `config.phases` (4 giai đoạn sáng/chiều) và các khe của `bot:total` đều giả định ngày học của trường. Một bộ máy chung cần mỗi báo cáo tự khai khung giờ (giờ bắt đầu, giờ kết thúc, mốc cắt) và chu kỳ (mỗi ngày một file, hay theo giai đoạn do chính định nghĩa đặt).

### E. Giao diện cho người không biết code

Panel đã dựng form từ JSON của `config:dump`; dùng cùng cách. Luồng: dán một tin mẫu, panel tìm các nhãn, người dùng nối nhãn với cột của mẫu, panel hiện một dòng xem trước, rồi lưu thành một file định nghĩa. Không gõ JSON, không gõ biểu thức chính quy.

### F. Excel là điều kiện của khách (người dùng đã chốt 2026-10-24)

Điền mẫu đi qua Excel COM và PowerShell; thư viện `xlsx` bản cộng đồng (0.18) không ghi được định dạng. Người dùng chốt giữ cách này: máy khách phải có Excel có bản quyền. Lý do kỹ thuật: COM không làm hỏng định dạng, macro, công thức của mẫu. Phương án thư viện ghi kiểu dáng, không cần Excel, đã bị loại (phụ thuộc mới, có thể mất macro của mẫu `.xlsm`). Điều này thay quyết định cũ "không cần Excel". Hệ quả cho phần thiết lập lần đầu: panel kiểm tra Excel có trên máy, và báo rõ nếu thiếu.

## Phân loại 15 mã báo cáo hiện có

Đây là phép thử chấp nhận: mỗi báo cáo dưới đây phải làm được bằng định nghĩa thì phép chuyển mới coi là đủ. Phân loại là phỏng đoán từ đọc mã, chưa dựng thử; phần "cần kiểm" ghi rõ chỗ chưa chắc.

| Bậc | Mã | Vì sao |
|---|---|---|
| 1 (một tin một dòng, chép trường) | `attendanceStart`, `attendanceEnd`, `shiftStart`, `shiftEnd` | `parseTechRow` đã là bảng nhãn, cột, bộ đổi giá trị; khung giờ và mốc cắt đã ở `config.techReports`. Làm đầu tiên. |
| 1 | `cleaning` | Đọc vài nhãn của tin CÔNG VIỆC CUỐI CA LÀM, mỗi tin một dòng (`parseCleaningMessage`). |
| 2 (giữ tin mới nhất theo phòng, xếp loại, khối chú giải) | `dien`, `netsupport`, `loa`, `internet`, `mayTinh` | Có `latestPerRoom`, xếp loại T/B/K hoặc A-E, sắp xếp, khối chú giải. Cần đủ các kiểu dòng trong menu. `mayTinh` xếp loại A-E theo số máy thiếu (`mayTinhGrade`): cần bảng ánh xạ có khoảng. Cần kiểm. |
| 3 (giữ là mã cắm thêm) | `maintenance`, `internetSpeed` | Ghi vào file tổng có sẵn bằng cách khớp mờ tên trường/khu vực/phòng với các dòng trong file (`findRow`, `schoolKeys`), có hàng "cần xem" cho dòng không khớp. Không phải việc "tin thành dòng". |
| 3 | `leave`, `minutes` | Đọc từ ảnh qua agent, kèm xem lại bằng tay. |
| 3 (cần kiểm trước khi chia bậc) | `attendance` | Gộp theo (người, ngày) và tính đi muộn/vi phạm theo giờ Zalo ghi nhận (`attendanceDays.ts`, `isDayViolated`); là quy tắc nghiệp vụ hơn là ánh xạ. Có thể rơi vào bậc 2 nếu quy tắc rút được thành ánh xạ có điều kiện. |

Con số: bậc 1 gồm 5 mã, bậc 2 gồm 5 mã, bậc 3 gồm 5 mã (kể cả `attendance` chưa chắc). Chắc chắn làm được bằng dữ liệu: 5 trên 15 (bậc 1). Làm được nếu menu kiểu dòng bao được bậc 2: 10 trên 15. Còn 5 giữ là mã cắm thêm; đó là lý do kết luận là "phần lớn, không phải tất cả".

Chỗ chưa có trong menu mà bậc 2 cần: `dien` điền cột Trường và Khu vực từ tên nhóm Zalo (qua `config.groupAliases`) khi tin không ghi, và sắp xếp theo T, B, K; năm báo cáo bậc 2 còn cần xử lý tin "gần giống" (xem mục A, tin gần khớp).

## Phép thử và thứ tự

1. Chuyển 4 báo cáo kỹ thuật sang định nghĩa trước. Khi cổng này, `fill-status-template.ps1` và các layout không đổi, nên phép thử chính là: bộ máy sinh ra CÙNG JSON `FileFillSpec` (các dòng, `headerCells`, `formulaCells`) như mã hiện tại cho cùng tin mẫu; cùng JSON thì Excel ra giống. Phép so sánh này chạy trong `npm test` với tin mẫu cố định, không cần Excel và không cần `data/`, nên chạy được ở bản Beta, trong worktree và trong subagent (Rule 4 cấm subagent chạy `fill:*` hay mở Excel).
2. Bản Beta không có `data/` và không có mẫu Excel (vì thế 13 test bị bỏ qua). Phép so sánh từng ô trong file Excel thật, trên dữ liệu và mẫu của bản gốc, chỉ làm MỘT lần thủ công ở cuối, không phải phép thử chính.
3. Sau đó `cleaning`, rồi bậc 2, mỗi nhóm sau khi menu kiểu dòng có đủ thứ nó cần.
4. Bậc 3 chỉ đăng ký như mã cắm thêm, không ép vào định nghĩa.

## Rủi ro

- **Menu kiểu dòng phình ra** thành một ngôn ngữ lập trình thứ hai khó dùng hơn mã. Chặn bằng: mỗi kiểu mới phải có một báo cáo thật đòi nó; ba kiểu đầu lấy từ bậc 1 và 2.
- **Tin gõ sai, lệch nhãn.** Phần lớn việc của mã đọc hiện nay là chịu lỗi (`spelling.ts`, `spellingAliases.ts`). Định nghĩa phải có chỗ khai cách gõ khác của nhãn, nếu không báo cáo mới của người dùng sẽ rơi hàng loạt vào "cần xem".
- **Thay đổi nhìn không thấy** trong tin mẫu: người dùng dán một tin, báo cáo chạy tốt, rồi người gửi đổi nhãn. Cần chỗ báo "nhãn mới chưa thấy" thay vì lặng lẽ để trống.

## Những chỗ của tài liệu bản bán bị thay

Tài liệu `2026-10-24-ban-cai-dat-ban-cho-nguoi-khac-design.md` đã có một ghi chú đầu trang liệt kê các mục bị thay: câu cuối của "Phạm vi đã chốt", dòng đầu của "Không làm", dòng cuối của "Điều làm việc này thất bại", bộ điều phối mỏng (nay còn chạy các định nghĩa sau mỗi lần cào), bước "Cách ly bản bán" (thêm điểm vào của bộ máy báo cáo), và quyết định 1, 2, 8.

## Việc để người xây quyết định

- Dạng cụ thể của file định nghĩa và của bộ đổi giá trị; tên thư mục định nghĩa (cần hỏi người dùng nếu là thư mục cấp cao mới, theo Rule 1).
- Cách chỉ vị trí trên mẫu (dấu thay thế hay nhấp ô) sau khi kiểm hai điều ở mục B.
- Thứ tự đổi `ReportKey`, và cách chia việc nếu giao subagent (Rule 4).

## Quy tắc dự án áp vào việc này

Việc phức tạp theo Rule 2: đụng nhiều module, `registry.ts`, `types/index.ts`, cách đọc tin và chọn dòng Excel. Kế hoạch triển khai qua advisor trước khi làm.
