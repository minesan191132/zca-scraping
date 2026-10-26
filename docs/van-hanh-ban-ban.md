# Vận hành bản bán: cấp giấy phép, phát hành, sao lưu

Tài liệu cho người bán (tác vụ chỉ làm ở máy của bạn). Khách không cần đọc. Hướng dẫn cho khách: [huong-dan-khach-hang.md](huong-dan-khach-hang.md).

## Khóa giấy phép

Giấy phép là một file JSON ký bằng khóa riêng Ed25519. Khóa công khai nằm trong `src/core/license.ts` (`LICENSE_PUBLIC_KEY_PEM`) và đã nhúng vào mọi gói.

- Khóa riêng: `<thư mục khóa>\license-private.pem`, **ngoài** repo. Không bao giờ đặt nó trong repo, trong `dist/` hay trong gói cài. `.gitignore` chặn `*.pem`, `license-private*` và `/license.json`; `scripts/distCheck.mjs` còn quét `dist/` tìm khóa riêng trước khi cho dựng.
- **Sao lưu khóa riêng ra ngoài máy** (USB, hay nơi bạn tin). Mất khóa thì không cấp hay gia hạn được giấy phép nào nữa. Cách cứu duy nhất là phát hành bản mới kèm khóa công khai khác, và mọi khách phải cấp lại giấy phép.
- Lộ khóa riêng thì ai cũng tự cấp giấy phép được. Khi đó tạo cặp khóa mới, thay `LICENSE_PUBLIC_KEY_PEM`, phát hành bản mới, cấp lại cho từng khách.
- Tạo cặp khóa mới (chỉ khi cần): dùng `generateKeyPairSync("ed25519")` của `node:crypto`, ghi khóa riêng thẳng vào file (định dạng `pkcs8`, `pem`) và chỉ in khóa công khai (`spki`, `pem`) ra màn hình. Đừng để khóa riêng hiện trên màn hình hay trong lịch sử lệnh.

## Cấp giấy phép cho một khách

1. Khách cài panel, mở lên. Thẻ **Giấy phép** hiện "Chưa có giấy phép" và dòng **Mã máy** (một GUID 36 ký tự). Khách bấm **Chép mã máy** và gửi cho bạn.
2. Ở máy bạn, trong thư mục repo:

   ```powershell
   npm run license:issue -- --customer "Tên khách" --machine <mã máy> --days 90 --key <thư mục khóa>\license-private.pem --out D:\Giay-phep\TenKhach.json
   ```

   Giấy phép gắn với **một máy** (MachineGuid của Windows) và có hạn. Beta cấp 90 ngày.
3. Gửi file `.json` cho khách. Khách bấm **Nhập giấy phép** và chọn file. Thẻ chuyển sang "Giấy phép hợp lệ", kèm tên khách và ngày hết hạn.
4. Đừng đặt file giấy phép của khách trong repo.

**Gia hạn**: cấp một file mới cho cùng mã máy, khách nhập lại. Nếu file mới bị từ chối, panel giữ nguyên giấy phép cũ đang dùng.

**Khách đổi máy hoặc cài lại Windows**: mã máy đổi, giấy phép cũ báo "cấp cho máy khác". Xin mã máy mới và cấp lại.

**Cách giấy phép được kiểm**: ngoại tuyến, mỗi lần khởi động bot điều khiển Zalo (`bot:watch`, `bot:dispatch`, `bot:scrape`). Sai, hết hạn hay thiếu thì bot in một câu rõ ràng và thoát với mã 3. Panel vẫn mở được để khách nhập giấy phép. Lưu ý: hệ thống không chặn ai tự xóa đoạn kiểm trong mã (mã công khai) hay tự dựng bản mới; nó chỉ chặn việc dùng bản của bạn mà không có giấy phép.

Máy bạn cũng chạy bản nguồn của hệ thống đầy đủ: `bot:watch`, `bot:runner` không cần giấy phép và **không chạy cùng lúc với bản cài** trên cùng máy (cả hai điều khiển một Zalo Desktop qua cổng 9222).

## Phát hành một bản mới

Kho phát hành công khai: `minesan191132/zca-scraping`. Cập nhật tự động của khách đọc từ đó, nên kho phải công khai.

1. Đổi số phiên bản trong `panel/package.json` (`version`). Khách chỉ nhận bản có số **lớn hơn** bản đang cài.
2. Ở thư mục gốc: `npm run typecheck`, `npm test`, `npm run build:dist`. Trong `panel/`: `npm run lint`, `npm run typecheck`, `npm test`.
3. Đặt token đẩy bản phát hành, chỉ trong cửa sổ PowerShell này:

   ```powershell
   $env:GH_TOKEN = "github_pat_..."
   ```

   Tạo token: GitHub, Settings, Developer settings, Fine-grained tokens, chỉ chọn repo `zca-scraping`, quyền **Contents: Read and write**, hạn 90 ngày. Không ghi token vào file nào và không commit.
4. Dựng và đăng:

   ```powershell
   cd panel
   npx electron-builder --config electron-builder.product.yml --win --publish always
   ```

   Việc này đăng `bao-cao-nhom-<phiên bản>-setup.exe`, file `.blockmap` và `latest.yml` thành một Release (ở dạng nháp). Vào GitHub, mở Release đó, kiểm file rồi bấm **Publish release**. Khách chỉ thấy bản đã Publish.
5. Không bao giờ đưa mã nguồn, giấy phép hay khóa vào Release. Chỉ có các file trên.

**Bản chưa ký số**: không đặt `publisherName`. Khách cài lần đầu sẽ thấy SmartScreen cảnh báo ("Windows đã bảo vệ PC của bạn"): bấm **Thông tin thêm** rồi **Vẫn chạy**. Cập nhật tự động vẫn hoạt động với bản chưa ký (đã thử: tải đủ file, kiểm sha512, không cài khi có `.scrape.lock`, mất mạng thì panel vẫn mở).

**Khi nào khách nhận bản mới**: panel kiểm lúc khởi động và mỗi 6 giờ, tải ngầm. Bản chỉ được cài ở lần kiểm đầu sau khi mở panel, và chỉ khi không có bot nào đang chạy (kể cả bot do lần mở panel trước khởi động), không có tác vụ nào và không có `data\.scrape.lock`. Không bao giờ cài lúc thoát panel. Nếu không đủ điều kiện, panel hiện "Có bản mới X, sẽ cài ở lần mở sau".

**Chưa kiểm tay** (cần cài thật): nhánh tự cài khi mọi điều kiện đủ, và việc bộ cài NSIS xử lý một `bao-cao-nhom.exe` đang chạy ở chế độ Node.

## Dựng thử không cài

```powershell
npm run build:dist
cd panel
npm run build:product:unpack     # chạy thử ở panel\dist-product\win-unpacked\bao-cao-nhom.exe
```

Thử giấy phép với dữ liệu tạm: đặt `ZBOT_HOME` về một thư mục rỗng rồi chạy `bao-cao-nhom.exe dist\cli\license-info.js` với `ELECTRON_RUN_AS_NODE=1`; nó in `@@JSON@@{...}` với `state` (`ok`, `missing`, `bad-signature`, `expired`, `wrong-machine`...).

## Dữ liệu của khách nằm ở đâu

`%LOCALAPPDATA%\BaoCaoNhom\`: `config.json`, `license.json`, `data\` (tin đã cào, hàng chờ, khóa `.scrape.lock`). Gỡ cài đặt không xóa thư mục này.

## Những thứ không đổi sau khi có khách

Tên "Báo Cáo Nhóm", `appId` `com.baocaonhom.app`, tên file chạy `bao-cao-nhom` và thư mục `BaoCaoNhom`. Đổi `appId` thì bản mới cài cạnh bản cũ; đổi tên thư mục dữ liệu thì dữ liệu của khách mồ côi. Tên kho `zca-scraping` cũng nằm trong mọi gói đã cài (nơi kiểm cập nhật); đổi tên kho thì khách cũ không nhận được bản mới.

## Việc nên làm mỗi lần

- Trước khi đẩy mã lên GitHub công khai: `git ls-files` không có `*.pem`, `license.json`, `config.json`, `dist/`, `data/`, `output/`, `.env`; không có tên người, trường hay đường dẫn máy thật trong mã, test, tài liệu.
- Làm việc trong repo `pub` (đã dọn tên). Đừng đẩy thư mục Beta cũ: lịch sử của nó có tên thật.
