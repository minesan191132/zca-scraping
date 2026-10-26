# Định nghĩa báo cáo bằng file dữ liệu

Mục tiêu: một báo cáo mới là một file JSON mô tả, không phải đoạn code, để người không biết lập trình thay hoặc thêm báo cáo. Thiết kế đầy đủ: [specs/2026-10-24-bao-cao-dinh-nghia-bang-du-lieu-design.md](superpowers/specs/2026-10-24-bao-cao-dinh-nghia-bang-du-lieu-design.md).

## Trạng thái hôm nay (đọc trước)

Mới xong **lát đầu tiên**. Hãy hiểu đúng phạm vi:

- Bốn báo cáo kỹ thuật (`attendanceStart`, `attendanceEnd`, `shiftStart`, `shiftEnd`) đã chạy qua engine này (`src/definitions/`, lệnh `fill:tech-reports`). Một bài test so sánh (`tests/definitionTechGolden.test.ts`) với mã cũ đã đóng băng cho kết quả giống nhau, và một lần đối chiếu Excel thật trên 200 ô không có khác biệt nào.
- Engine đã đọc được các file `*.json` trong `<dataDir>\definitions\`, kiểm hợp lệ và báo lỗi từng file mà không dừng. **Nhưng hôm nay chưa có tác dụng với báo cáo mới của khách**: `fill:tech-reports` chỉ chạy bốn mã cố định ở trên, mã trùng với bản dựng sẵn thì bản dựng sẵn thắng, và danh sách mã báo cáo trong cấu hình vẫn cố định trong mã. Một file JSON mới đặt vào thư mục `definitions` hiện không tạo ra báo cáo nào.
- Bản bán (`dist/`) **chưa kèm** `fill:tech-reports`, nên khách chưa dùng engine này.
- Chưa có giao diện để soạn định nghĩa.

Phần còn lại của tài liệu mô tả định dạng đã được kiểm hợp lệ, để bạn soạn trước và để các lát sau (xem cuối) dựa vào.

## Một báo cáo gồm ba tầng

1. **Nhận tin**: tin nào thuộc báo cáo (theo tiêu đề dòng đầu và các nhãn bắt buộc).
2. **Đọc trường**: nhãn nào đổ vào cột Excel nào, đổi giá trị ra sao.
3. **Ghi Excel**: mẫu nào, sheet nào, dòng bắt đầu, dòng TỔNG, ô ngày và ô người báo cáo.

## Định dạng

Mỗi file `*.json` là một định nghĩa. Ví dụ (rút từ báo cáo điểm danh đầu buổi, viết ra dạng file):

```json
{
  "code": "diemDanhMoi",
  "label": "ĐIỂM DANH MỚI",
  "titles": ["ĐIỂM DANH MỚI"],
  "requiredLabels": ["ten truong"],
  "sttColumn": "A",
  "columns": [
    { "column": "B", "labels": ["cap"], "convert": "itLevel" },
    { "column": "C", "labels": ["ten truong"], "convert": "text" },
    { "column": "F", "labels": ["thoi gian"], "convert": "clockOrSentTime" },
    { "column": "G", "labels": ["tong so it"], "convert": "numberOrText" }
  ],
  "window": { "cutoff": "08:30" },
  "template": {
    "file": "MAU.xlsx",
    "sheet": "Sheet1",
    "firstDataRow": 4,
    "totalRowBefore": 8,
    "lastColumn": "J",
    "copyFirstRowFormat": true
  },
  "header": { "dateCell": "J2", "reporterCell": "A2", "reporterPrefix": "Nhân viên báo cáo: " },
  "total": { "column": "C" }
}
```

### Các trường

| Trường | Ý nghĩa |
|---|---|
| `code` | Mã báo cáo: chữ và số, bắt đầu bằng chữ, không trùng mã khác |
| `label` | Tên hiển thị |
| `titles` | Các tiêu đề (dòng đầu của tin) nhận diện báo cáo. So không phân biệt hoa thường, dấu và dấu câu hai đầu. Có thể rỗng nếu dùng `titleScope` |
| `titleScope` | (tùy chọn) mượn nhóm tiêu đề có sẵn trong bảng chính tả thay vì tự liệt kê |
| `labelScope` | (tùy chọn) bộ sửa nhãn gõ sai có sẵn: `attendance`, `shiftStart`, `shiftEnd` |
| `requiredLabels` | Nhãn bắt buộc có giá trị. Thiếu thì tin là "gần giống" và vào mục cần xem, không bị bỏ lặng lẽ |
| `sttColumn` | Cột số thứ tự (một hoặc hai chữ cái hoa) |
| `columns` | Danh sách cột: `column`, `labels`, `convert` |
| `continuationLabel` | (tùy chọn) nhãn mà các dòng tiếp theo không có dấu hai chấm được nối vào giá trị của nó |
| `window.cutoff` | Mốc giờ `HH:MM`: chỉ tin gửi trong ngày đến mốc này |
| `template` | Mẫu Excel: `file`, `sheet`, `firstDataRow`, `totalRowBefore` (phải lớn hơn `firstDataRow`), `lastColumn`, và tùy chọn `deleteSheets`, `copyFirstRowFormat` |
| `header` | `dateCell` (ô ngày, ví dụ `J2`), tùy chọn `reporterCell` và `reporterPrefix` |
| `total.column` | Cột đếm cho dòng TỔNG |

### Nhãn

`labels` viết ở dạng đã chuẩn hóa: chữ thường, bỏ dấu, mọi ký tự không phải chữ hay số thành một khoảng trắng. "Phường / Xã" và "Phường/Xã" cùng thành `phuong xa`; "Tên Trường" thành `ten truong`. Một cột có thể nhận nhiều nhãn (nhãn đồng nghĩa).

### Bộ đổi giá trị (`convert`)

| Tên | Làm gì |
|---|---|
| `text` | Chép nguyên văn; rỗng thì để trống |
| `numberOrText` | Số hoặc số kèm đơn vị đếm ("51 máy", "3 người") thành số; chữ khác chép nguyên văn |
| `bulletList` | Danh sách ngăn bởi dấu phẩy hay chấm phẩy thành mỗi ý một dòng "- ý" |
| `bulletListSkipNone` | Như trên, bỏ các ý nghĩa là "không có" |
| `roomNumbers` | "PM2" thành 2; "PM2, PM3, PM4" thành "2, 3, 4"; không có số nào thì chép nguyên văn |
| `leadingNumber` | "1 hoạt động" thành 1; không bắt đầu bằng số thì chép nguyên văn |
| `clock` | Giờ trong tin ("9:00", "09h30", "9g30") thành giờ của Excel |
| `clockOrSentTime` | Như `clock`, không đọc được thì lấy giờ gửi tin |
| `speedMbps` | Tốc độ mạng đổi về Mbps |
| `itLevel` | Cấp học (ví dụ "THCS") đã chuẩn hóa |

### Kiểm hợp lệ

Mỗi file được kiểm trước khi dùng (`src/definitions/validate.ts`). Lỗi được báo bằng tên trường và lý do bằng tiếng Việt, ví dụ `columns[2].column: cột F bị dùng hai lần`. File lỗi chỉ bị bỏ qua và ghi một dòng cảnh báo; các file khác vẫn nạp. Trùng mã với bản dựng sẵn thì bản dựng sẵn thắng; trùng giữa hai file của khách thì file đứng trước theo tên thắng. Cả hai đều có cảnh báo.

## Tin thiếu nhãn đi đâu

Tin đúng tiêu đề mà thiếu nhãn bắt buộc không bị bỏ. Nó được ghi vào `canxem_<mã>_<ngày>.json` (`src/definitions/review.ts`) để người xem, và lệnh in cảnh báo kèm số tin.

## Việc còn lại (theo thứ tự dự kiến)

1. Đổi `ReportKey` từ danh sách cố định sang chuỗi lúc chạy, để mã của file JSON được bật trong cấu hình.
2. Chuyển báo cáo VỆ SINH và 5 báo cáo mức 2 (ĐIỆN, NETSUPPORT, ÂM THANH, INTERNET, MÁY TÍNH) sang định nghĩa.
3. Mẫu Excel dùng ô giữ chỗ thay cho việc đo vị trí bằng tay.
4. Tổng quát hóa khái niệm "ngày học" cho mọi loại báo cáo.
5. Giao diện soạn định nghĩa trong panel, cho người không biết lập trình.

Các báo cáo cần logic riêng (bảo trì, tốc độ mạng, nghỉ phép, biên bản, điểm danh nội quy) vẫn là code cắm vào, không phải file dữ liệu. Chi tiết phân loại ở bảng 15 mã trong bản thiết kế.
