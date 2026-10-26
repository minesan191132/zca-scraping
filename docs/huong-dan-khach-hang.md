# Báo Cáo Nhóm: hướng dẫn cài đặt và sử dụng (bản Beta)

Tài liệu gửi cho khách. Viết theo đúng những gì bản Beta có hôm nay.

## Báo Cáo Nhóm làm gì

Phần mềm đọc tin nhắn của các nhóm Zalo bạn chỉ định, từ chính **Zalo Desktop** đang đăng nhập trên máy bạn, và lưu về máy dưới dạng file. Nó chỉ đọc, không gửi tin và không cần đăng nhập Zalo lần nữa.

Bản Beta là phần lõi: theo dõi tin mới, cào tin của nhóm có tin mới, lưu lại. Các báo cáo Excel theo mẫu chưa kèm theo.

## Máy cần có

- Windows 10 trở lên.
- **Zalo Desktop** đã cài và đã đăng nhập tài khoản cần lấy dữ liệu.
- Microsoft Excel (có bản quyền) cho các báo cáo Excel sau này. Beta hiện chưa cần đến Excel.
- Không cần cài Node.js hay công cụ nào khác.

## Cài đặt

1. Chạy file `bao-cao-nhom-<phiên bản>-setup.exe`.
2. Windows có thể hiện "Windows đã bảo vệ PC của bạn", vì bản Beta chưa ký số. Bấm **Thông tin thêm**, rồi **Vẫn chạy**.
3. Chọn thư mục cài hoặc để mặc định, bấm cài. Một lối tắt **Báo Cáo Nhóm** xuất hiện trên màn hình nền.

## Khai báo nhóm cần theo dõi

1. Vào trang **Chung** (thanh bên trái), tìm cài đặt **targets** (danh sách nhóm).
2. Mỗi dòng là tên một nhóm. **Tên phải trùng đúng từng chữ, từng dấu với tên hiện ở thanh bên Zalo Desktop.** Phần mềm không đọc được thanh bên Zalo của bạn nên không tự kiểm được. Gõ sai tên thì bot không báo lỗi, chỉ là không theo dõi nhóm đó. Cách chắc nhất: sao chép tên nhóm từ Zalo rồi dán vào.
3. Bấm **Lưu cấu hình**. Nếu một giá trị không hợp lệ, phần mềm báo lỗi và không ghi gì; sửa rồi lưu lại.

Các cài đặt khác (cổng, đường dẫn Zalo...) đã có giá trị mặc định đúng cho hầu hết máy. Nếu Zalo cài ở nơi không mặc định, đặt đường dẫn `Zalo.exe` ở cài đặt **zaloExePath**.

Sau khi đổi cài đặt, hãy bấm **Dừng** rồi **Khởi động** lại bot để cài đặt mới có hiệu lực.

## Bật bot

Vào trang **Bot**. Có hai bot:

- **Theo dõi tin nhắn**: nghe Zalo Desktop để biết nhóm nào có tin mới.
- **Điều phối cào**: đợi khoảng 30 giây không có tin mới rồi cào đúng các nhóm có tin mới.

Bấm **Khởi động** ở cả hai. Lần đầu, bot tự đóng và mở lại Zalo Desktop để bật cổng điều khiển (cần thiết để đọc tin). Phiên đăng nhập Zalo không mất.

Lưu ý quan trọng:

- **Đóng Báo Cáo Nhóm là dừng các bot do nó đã bật.** Muốn thu thập liên tục, hãy để cửa sổ ứng dụng mở (có thể thu nhỏ).
- Khi bot cào, nó điều khiển Zalo Desktop: nó chọn nhóm và cuộn tin. Hãy tránh dùng chuột, bàn phím trong Zalo vào lúc đó.
- Máy ngủ hoặc tắt thì không thu thập được tin trong lúc đó.
- Đừng chạy hai bản của phần mềm cùng lúc trên một máy.

## Tin được lưu ở đâu

Mọi thứ nằm trong thư mục `%LOCALAPPDATA%\BaoCaoNhom` (gõ đường dẫn này vào thanh địa chỉ của File Explorer):

- `config.json`: cài đặt của bạn.
- `data\`: tin đã cào, mỗi nhóm một file `.json`.

Gỡ cài đặt phần mềm không xóa thư mục này.

## Cập nhật

Phần mềm tự kiểm bản mới khi mở và mỗi 6 giờ. Khi có, nó tải ngầm và hiện thông báo "Có bản mới X, sẽ cài ở lần mở sau". Bản mới được cài khi bạn **mở lại ứng dụng** và lúc đó không có bot nào đang chạy. Nó không bao giờ cài giữa lúc bot đang thu thập. Mất mạng thì không có gì xảy ra.

## Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Bot bật nhưng không có tin nào | Tên nhóm sai chính tả, hoặc Zalo chưa đăng nhập | So lại tên nhóm với thanh bên Zalo; đăng nhập Zalo Desktop |
| Bot dừng khi tôi đóng ứng dụng | Đúng thiết kế | Để ứng dụng mở khi cần thu thập |
| Lưu cấu hình báo lỗi | Giá trị không hợp lệ | Đọc dòng lỗi, sửa đúng ô đó |

Khi cần hỗ trợ, gửi cho nhà cung cấp: ảnh màn hình trang Tổng quan, và nội dung nhật ký ở trang bot.

## Quyền riêng tư

Phần mềm chỉ đọc nhóm bạn khai báo, từ phiên Zalo bạn đã đăng nhập. Dữ liệu lưu trên máy của bạn. Phần mềm chỉ kết nối mạng để kiểm bản cập nhật.
