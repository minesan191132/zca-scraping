// Cách viết sai, viết tắt hoặc đổi chữ hay gặp của nhãn, tiêu đề và giá trị trong tập đóng của từng báo cáo. Chỉ chứa dữ liệu, chỉ import file khác trong constants/, không import gì từ phần còn lại của src/
// (cùng lý do với reportTitles.ts). Các parser dùng bảng này qua src/lesson/spelling.ts; thêm một dòng vào đây là parser nhận thêm dạng viết sai đó (cần khởi động lại bot).
//
// Mỗi mục là { canonical, variants }: `canonical` là dạng đúng của form (khớp tin mẫu trong .claude/skills/du-lieu-nhom-*/references/mau-tin.md), `variants`
// là các dạng sai đã biết, ghi đúng như người gửi gõ (có dấu, hoa thường tùy ý).
// Nơi dùng sẽ so sau khi bỏ dấu, bỏ hoa thường, mọi ký tự không phải chữ số hay chữ cái thành một khoảng trắng và gộp khoảng trắng, nên bảng KHÔNG ghi các lỗi
// mà bước đó đã xóa: thiếu dấu, sai dấu thanh ("Truờng"), hoa thường, thừa khoảng trắng, "Phường/Xã" hay "Phường - Xã". tests/spellingAliases.test.ts bắt mục thừa.
// Chỉ khớp chính xác sau bước đó, không so gần đúng: chữ gần giống thường là một nơi khác thật ("Sao Mai 1" và "Sao Mai 2").
//
// Các cách sai đã dùng để nghĩ ra mục: gõ Telex dư phím ("Truongf", "ddiem"); thiếu, thừa hoặc đảo chữ ("Truog", "Trườngg", "HT"); dính hoặc tách từ ("Tên Trường" thành
// "TênTrường"); bỏ bớt từ ("Số máy lỗi"); viết tắt ("GV", "PM", "TS máy"); từ đồng nghĩa ("Số máy hỏng"); đảo thứ tự từ ("Xã / Phường").
// Không ghi: chữ tự do (tên trường, phường/xã, ghi chú, tên người: lỗi gõ không đếm hết), và lỗi định dạng giờ, số ("9g30", "45Mb": sửa ở parser, không phải chính tả).

import { MESSAGE_TITLES } from "./reportTitles.js";

export interface SpellingEntry {
    /** Dạng đúng của form. */
    canonical: string;
    /** Các dạng sai hay gặp, không kể những dạng chỉ khác `canonical` ở dấu, hoa thường, khoảng trắng hay dấu câu. */
    variants: readonly string[];
}

const entry = (canonical: string, ...variants: string[]): SpellingEntry => ({ canonical, variants });

/** Bốn dòng đầu giống nhau ở form trường và cả bốn form IT điểm danh, đầu ca, cuối ca. */
export const SCHOOL_HEADER_LABELS = {
    cap: entry("Cấp", "Cấp học", "Cấp độ", "Capp", "Cp"),
    tenTruong: entry("Tên Trường", "Tên trường học", "Trường", "Tên Trg", "Tn Trường", "Tê Trường", "Tên Trườg", "Tên Trườn", "Tên Trưng", "Tenn Trường", "Ten Truongf", "TênTrường"),
    phanHieu: entry("Phân hiệu", "Phân hiệu trường", "Cơ sở", "Cơ sở trường", "Phân hiệu / Cơ sở", "Phân hiệu (nếu có)", "Phânhiệu", "Phân hiu", "Phân hiệ", "Pân hiệu", "Phân hệu", "Phânn hiệu", "Phân hiệuu"),
    phuongXa: entry("Phường / Xã", "Phường", "Xã", "Xã / Phường", "Phường / Xã / Thị trấn", "Phường / Xã / TT", "P / X", "Phườg / Xã", "Phườn / Xã", "Phường / X", "Phườngg / Xã", "PhườngXã", "Phưng / Xã"),
} as const satisfies Record<string, SpellingEntry>;

/** Form trường: BÁO CÁO ĐẦU BUỔI / CUỐI BUỔI (DẠY). Khóa là `FieldKey` của parseReport.ts. */
export const SCHOOL_FORM_LABELS = {
    giaoVien: entry("Tên Giáo viên", "Tên GV", "GV", "Giáo viên", "Giáo viên dạy", "Tên giáo viên dạy", "Tên Giáo viê", "Tên Giáo vên", "Tên Giá viên", "TênGiáo viên", "Tên Giáoviên", "Tên Giáo viênn"),
    phongMay: entry("Phòng máy", "Phòng", "PM", "Phòng máy học", "Phòng máy số", "Phòngmáy", "Phòn máy", "Phòng má", "Phog máy", "Phòng máyy"),
    tong: entry("Tổng số máy", "Tổng máy", "Tổng số máy tính", "Tổng số PC", "TS máy", "Tổng SM", "Tổng số má", "Tổng sốmáy", "Tổng số máyy"),
    loi: entry("Số máy bị lỗi", "Số máy lỗi", "Tổng số máy bị lỗi", "Tổng số máy lỗi", "Số máy hỏng", "Số máy bị hỏng", "Tổng số máy hỏng", "Máy lỗi", "Máy bị lỗi", "Số lượng máy lỗi", "SL máy lỗi", "Số máy bị lỗ", "Số máy bị lỗii", "Số máy bịlỗi"),
    thieu: entry("Số máy còn thiếu", "Số máy còn thiếu cho HS", "Số máy thiếu", "Tổng số máy thiếu", "Số máy còn thiếu cho học sinh", "Số máy thiếu cho HS", "Máy thiếu", "Máy còn thiếu", "SL máy thiếu", "Số máy còn thiế", "Số máy còn thiu", "Số máy còn thếu", "Số máy conthiếu", "Số máy còn thiếuu"),
    netSupport: entry("Tình trạng Netsupport", "Tình trạng Net support", "Tình trạng Netsuport", "Tình trạng Netsuppor", "Tình trạng Netsuppot", "Tình trạng Netsupot", "Tình trạng Netsuppport", "Tình trạng Netsupprt", "Tình trạng Nestupport", "Tình trạng Nesupport", "Tình trạng NS", "Tình trạng phần mềm Netsupport", "Tình trạng Netsupport School", "Tình trạng Netsupportt", "Netsupport", "Tình trạg Netsupport", "Tìn trạng Netsupport", "Tình trạn Netsupport", "Tìnhtrạng Netsupport", "Tinhf trạng Netsupport"),
    amThanh: entry("Tình trạng Âm thanh", "Tình trạng Loa, Âm ly", "Tình trạng Loa", "Tình trạng Loa, Amply", "Tình trạng Loa, Ampli", "Tình trạng Âm ly", "Tình trạng Amply", "Tình trạng Âm thnh", "Tình trạng Âm tanh", "Tình trạng Âm thah", "Tình trạng Âm thanhh", "Tình trạng Âmthanh", "Tình trạng Âm than", "Âm thanh", "Tình trạg Âm thanh", "Tìn trạng Âm thanh", "Tinhf trạng Âm thanh"),
    mayLanh: entry("Tình trạng Máy lạnh", "Tình trạng máy lạnh, máy quạt", "Tình trạng Máy lạng", "Tình trạng Mái lạnh", "Tình trạng Máylạnh", "Tình trạng Máy lạn", "Tình trạng Máy lạh", "Tình trạng Máy lạnhh", "Tình trạng Máy lạnh/quạt", "Tình trạng Máy quạt", "Tình trạng Điều hòa", "Tình trạng Máy điều hòa", "Máy lạnh", "Tình trạg Máy lạnh", "Tìn trạng Máy lạnh", "Tinhf trạng Máy lạnh"),
} as const satisfies Record<string, SpellingEntry>;

/** Dòng của form trường mà bot cố ý không đọc: gõ sai thì vẫn phải được nhận ra là dòng bỏ qua, không thành "nhãn lạ" cần xem. */
export const SCHOOL_FORM_IGNORED_LABELS = {
    troGiang: entry("Tên Trợ giảng", "Tên TG", "Trợ giảng", "TG", "Tên Trợ giản", "Tên Trợ giảg", "Tên Trợ gảng", "Tên Trợgiảng", "Tên Trợ giảngg"),
    internet: entry("Tình trạng Internet", "Tình trạng mạng", "Tình trạng Intenet", "Tình trạng Interet", "Tình trạng Internt", "Tình trạng Internett", "Tình trạg Internet"),
    tocDo: entry("Tốc độ internet", "Tốc độ mạng", "Tốc độ Intenet", "Tốc độ Interet", "Tốc độ Internt", "Tốc độ Wifi", "Tốc độ net", "Tốc độ", "Tốc ddộ internet", "Tốcđộ internet"),
} as const satisfies Record<string, SpellingEntry>;

/** Form IT: ĐIỂM DANH ĐẦU BUỔI / CUỐI BUỔI (ngoài bốn dòng đầu). */
export const IT_ATTENDANCE_LABELS = {
    thoiGian: entry("Thời gian", "Giờ", "Thời gian điểm danh", "Giờ điểm danh", "Thời gia", "Thời gan", "Thời ian", "Thờigian", "Thời gianh"),
    tongIT: entry("Tổng số IT", "Tổng IT", "Tổng số nhân viên IT", "TS IT", "Tổng số CTV", "Tổng sốIT", "Tổng số I", "Tổng số IIT", "Tổng số TI"),
    tenIT: entry("Tên IT, CTV", "Tên IT", "Tên nhân viên IT", "IT, CTV", "Tên CTV", "Tên IT, CVT", "Tên IT, CTC", "Tên IT, CT", "TênIT, CTV", "Tên TI, CTV", "Tên IT, Cộng tác viên", "Tên I, CTV"),
    thucTap: entry("Thực tập IT", "Thực tập", "Thực tập sinh", "Thực tập sinh IT", "TTS IT", "Thực tập TI", "Thực tập I", "Thự tập IT", "Thực tậ IT", "Thực tập IIT", "Thựctập IT"),
    vang: entry("Nhân viên vắng", "Nhân viên nghỉ", "Nhân viên vắng mặt", "Vắng", "Vắng mặt", "Số nhân viên vắng", "Số người vắng", "Người vắng", "NV vắng", "Nhân viên vắn", "Nhân viên vắg", "Nhânviên vắng"),
} as const satisfies Record<string, SpellingEntry>;

/** Form IT: CÔNG VIỆC ĐẦU CA LÀM (ngoài bốn dòng đầu). */
export const IT_SHIFT_START_LABELS = {
    truongNhom: entry("Trưởng nhóm IT", "Trưởng nhóm", "Nhóm trưởng IT", "Nhóm trưởng", "TN IT", "Trưởng nhóm I", "Trưởng nhóm TI", "Trưởng nhómIT", "Trưởg nhóm IT", "Trưởn nhóm IT", "Trưởng nhó IT", "Trưởng nhm IT", "Trưởng nhóm IIT"),
    batDau: entry("Bắt đầu giờ làm", "Bắt đầu làm", "Giờ bắt đầu", "Giờ bắt đầu làm", "Bắt đầu giờ", "Giờ vào làm", "Giờ vào", "Bắt đầu giờ làm việc", "Bắt đầu lúc", "Bắt đầu gờ làm", "Bắt đầu giờ lm", "Bắt đầu giờlàm", "Bắt đầu giời làm", "Bắt đầu giờ là", "Bắt ddầu giờ làm"),
    pmTruong: entry("Phòng máy trường", "Phòng máy của trường", "Phòng máy tại trường", "Số phòng máy trường", "PM trường", "PM trg", "Phòng máy trg", "Phòng máy trườg", "Phòng máy trưng", "Phòng máy trườn", "Phòngmáy trường", "Phòng máy tường", "Phòng máy Trường học"),
    pmCongTy: entry("Phòng máy công ty", "Phòng máy của công ty", "Phòng máy cty", "Phòng máy CT", "PM công ty", "PM cty", "Phòng máy công ti", "Phòng máy côngty", "Phòng máy công t", "Phòng máy côg ty", "Phòng máy cônng ty"),
    pmLamViec: entry("Phòng máy làm việc", "Phòng máy làm", "Phòng máy đang làm việc", "Phòng máy làm việc hôm nay", "PM làm việc", "Phòng làm việc", "Phòng máy làm việ", "Phòng máy làm vịc", "Phòng máy làmviệc", "Phòng máy lm việc", "Phòng máy lamf việc", "Phòng máy làm việcc", "Phòng máy làm vệc"),
    congViec: entry("Công việc thực hiện", "Công việc đã thực hiện", "Công việc làm", "Nội dung công việc", "Công việc", "Công việc thực hiê", "Công việc thực hin", "Công việc thực hiệnn", "Công việ thực hiện", "Công việc thự hiện", "Côngviệc thực hiện", "Công vc thực hiện", "Cônng việc thực hiện"),
} as const satisfies Record<string, SpellingEntry>;

/** Form IT: CÔNG VIỆC CUỐI CA LÀM (ngoài bốn dòng đầu). Các dòng con dưới "Công việc hoàn thành:" có dấu "+" đầu dòng, bước so khớp bỏ dấu đó. */
export const IT_SHIFT_END_LABELS = {
    truongNhom: IT_SHIFT_START_LABELS.truongNhom,
    ketThuc: entry("Kết thúc giờ làm", "Kết thúc làm", "Giờ kết thúc", "Giờ kết thúc làm", "Kết thúc giờ", "Giờ về", "Giờ ra về", "Kết thúc giờ làm việc", "Kết thúc lúc", "Kết thúc gờ làm", "Kết thúc giờ lm", "Kết thúc giờlàm", "Kết thúc giời làm", "Kết thúc giờ là", "Kết thúc thúc giờ làm", "Kết túc giờ làm", "Kếtthúc giờ làm"),
    pmLamViec: IT_SHIFT_START_LABELS.pmLamViec,
    congViecHoanThanh: entry("Công việc hoàn thành", "Công việc đã hoàn thành", "Công việc hoàn tất", "Công việc đã làm", "Công việc hoàn thàn", "Công việc hoàn thnh", "Công việ hoàn thành", "Côngviệc hoàn thành", "Công việc hoàn thànhh"),
    tongMay: entry("Tổng số máy", "Tổng máy", "Tổng số máy tính", "Số máy", "Tổng số PC", "TS máy", "Tổng SM", "Tổng số má", "Tổng sốmáy", "Tổng số máyy"),
    mayHoatDong: entry("Số máy hoạt động", "Số máy đang hoạt động", "Số máy hoạt động tốt", "Số máy sử dụng được", "Số máy dùng được", "Máy hoạt động", "Số máy hđ", "Số máy hoạt độg", "Số máy hoạt đng", "Số máy hoạt độn", "Số máy hoạtđộng", "Số máy hạt động", "Số máy hoạt ddộng"),
    mayLoi: entry("Số máy còn lỗi", "Số máy lỗi", "Số máy bị lỗi", "Số máy hỏng", "Số máy còn hỏng", "Máy còn lỗi", "Máy lỗi", "SL máy lỗi", "Số máy lỗi còn lại", "Số máy chưa sửa", "Số máy còn lỗ", "Số máy còn lỗii", "Số máy cònlỗi", "Số máy cn lỗi", "Số máy cò lỗi"),
    hdh: entry("HĐH Windows", "Hệ điều hành Windows", "Hệ điều hành", "HĐH", "Windows", "HĐH Window", "HĐH Windown", "HĐH Windoes", "HĐH Windws", "HĐH Wndows", "HĐH Winodws", "HĐH Windos", "HĐH Windows 10", "HĐH Win", "HĐHWindows", "HĐ Windows", "HĐH Windowss", "HĐH Widows", "Hệ điều hành Window"),
    office: entry("Phần mềm MS Office", "Phần mềm Office", "Phần mềm Microsoft Office", "MS Office", "Office", "Phần mềm MS Ofice", "Phần mềm MS Offce", "Phần mềm MS Offic", "Phần mềm MS Offiec", "Phần mềm MSOffice", "Phần mềm M Office", "Phần mềm Mc Office", "Phần mềm MS Offices", "Phần mềm Word", "Phần mềm văn phòng", "Phần mềm", "Phần mềm Mircosoft Office", "Phần mềm Microsoft Ofice", "Phần mm MS Office", "Phầnmềm MS Office", "Phần mền MS Office"),
    netSupport: entry("Tình trạng Netsupport", ...SCHOOL_FORM_LABELS.netSupport.variants),
    amThanh: entry("Tình trạng Âm thanh", ...SCHOOL_FORM_LABELS.amThanh.variants),
    tocDo: entry("Tốc độ Internet", "Tốc độ mạng", "Tốc độ", "Tốc độ mạng Internet", "Tốc độ truy cập Internet", "Tốc độ Wifi", "Tốc độ net", "Speed Internet", "Tốc độ Intenet", "Tốc độ Interet", "Tốc độ Internt", "Tốc độ Interner", "Tốc độ Inernet", "Tốc độ Itnernet", "Tốc độ Intrnet", "Tốc độ Interenet", "Tốc độ Internetn", "Tốc độ Interne", "Tốc độ Intrenet", "Tốcđộ Internet", "Tố độ Internet", "Tốc ddộ Internet"),
    mayLanh: entry("Hiện trạng máy lạnh", "Hiện trạng điều hòa", "Tình trạng máy lạnh", "Tình trạng điều hòa", "Hiện trạng máy lạng", "Hiện trạng máy lạn", "Hiện trạng máy lạh", "Hiện trạg máy lạnh", "Hiện trạn máy lạnh", "Hiện trạng máylạnh", "Hiện trạng máy lạnh, quạt", "Hiện trạng máy lạnh máy quạt", "Hiện tạng máy lạnh", "Hiện rạng máy lạnh", "Hiệnn trạng máy lạnh", "Hiệntrạng máy lạnh"),
    camera: entry("Camera hỗ trợ", "Camera", "Cam hỗ trợ", "Cam", "Camera giám sát", "Camra hỗ trợ", "Cmera hỗ trợ", "Camer hỗ trợ", "Camerea hỗ trợ", "Cameraa hỗ trợ", "Camera hỗ trự", "Camera hỗ tr", "Camera hỗtrợ", "Camera hỗ tợ"),
    veSinh: entry("Vệ sinh phòng máy", "Vệ sinh", "Vệ sinh PM", "Vệ sinh phòng", "VS phòng máy", "Dọn vệ sinh phòng máy", "Vệ sinh phòng máy tính", "Vệ snh phòng máy", "Vệ sin phòng máy", "Vệ sinh phòg máy", "Vệ sinh phòng má", "Vệ sinh phòngmáy", "Vệsinh phòng máy", "Vệ sinhh phòng máy", "Vệ sih phòng máy", "Vệ sinh phòn máy", "Vệ sing phòng máy", "Vệ sinh pòng máy"),
    baoTri: entry("Hoàn thiện bảo trì", "Hoàn thành bảo trì", "Hoàn tất bảo trì", "Bảo trì", "Bảo trì hoàn thiện", "Hoàn thiện bảo dưỡng", "Hoàn thành bảo dưỡng", "Hoàn thiện bảo trìì", "Hoàn thiện bảo tr", "Hoàn thiện bảo rì", "Hoàn thiện bảotrì", "Hoàn thiệ bảo trì", "Hoàn thện bảo trì", "Hoàn hiện bảo trì", "Hoàn thiện bả trì", "Hoàn thiệnn bảo trì", "Hoàn thienj bảo trì"),
    hinhAnh: entry("Hình ảnh phòng máy", "Hình ảnh", "Ảnh phòng máy", "Hình phòng máy", "Hình ảnh PM", "Hình ảnh phòng", "Hình ảnh phòg máy", "Hìn ảnh phòng máy", "Hình ảnh phòng má", "Hình ảnh phòngmáy", "Hình ảh phòng máy", "Hình ảnhh phòng máy", "Hìh ảnh phòng máy", "Hình ảnh phòn máy", "Hình ảnh pòng máy", "Hìnhảnh phòng máy", "Hình ản phòng máy"),
    yKien: entry("Ý kiến bổ sung", "Ý kiến", "Ý kiến khác", "Ý kiến thêm", "Ghi chú", "Bổ sung", "Ý kiến bổ xung", "Ý kiến bổ sun", "Ý kiế bổ sung", "Ý kiến bổ sug", "Ý kiếnbổ sung", "Ý kiến bổ sungg"),
} as const satisfies Record<string, SpellingEntry>;

/** Form IT: LỖI ĐIỆN. */
export const ELECTRIC_LABELS = {
    truong: entry("Trường", "Tên Trường", "Tên trường học", "Trường học", "Trg", "Tên Trg", "Trườg", "Trườn", "Trườngg", "Truongf"),
    khuVuc: entry("Khu vực", "Khu", "KV", "Quận / Huyện", "Phường / Xã", "Địa điểm", "Khu vựcc", "Khu vc", "Kh vực", "Khuvực", "Khu vự", "Kuh vực", "Khu cực"),
    phongMay: entry("Phòng Máy", "Phòng", "PM", "Phòng máy số", "Phòngmáy", "Phòn máy", "Phòng má", "Phog máy", "Phòng máyy"),
    tinhTrang: entry("Tình trạng", "Tình trạng lỗi", "Tình trạng điện", "Lỗi", "Mô tả lỗi", "Hiện trạng", "Trạng thái", "Tình trạg", "Tìn trạng", "Tình trạn", "Tìnhtrạng", "Tinhf trạng", "Tình trạngg"),
} as const satisfies Record<string, SpellingEntry>;

/**
 * Dòng đầu (tiêu đề) của tin. Chỉ gộp lỗi chính tả: KHÔNG bao giờ để một dạng sai của ĐẦU thành CUỐI hay ngược lại (test chặn). "DẠY" của form trường đã được `classifyTitle` bỏ qua,
 * nên hai tiêu đề trường ghi không có chữ đó.
 */
export const TITLE_ALIASES = {
    schoolStart: entry("BÁO CÁO ĐẦU BUỔI", "BÁO CÁO ĐẦU BUỔI DẠY", "BC ĐẦU BUỔI", "BÁO CÁO ĐẦU BUỔ", "BÁO CÁ ĐẦU BUỔI", "BÁO CÁO ĐẦU BỔI", "BÁOCÁO ĐẦU BUỔI", "BÁO CÁO ĐẦUBUỔI", "BÁO CÁO ĐẦU BUỔII", "BÁO CÁO ĐẦU BUI"),
    schoolEnd: entry("BÁO CÁO CUỐI BUỔI", "BÁO CÁO CUỐI BUỔI DẠY", "BC CUỐI BUỔI", "BÁO CÁO CUỐI BUỔ", "BÁO CÁ CUỐI BUỔI", "BÁO CÁO CUỐI BỔI", "BÁOCÁO CUỐI BUỔI", "BÁO CÁO CUỐIBUỔI", "BÁO CÁO CUỐI BUỔII", "BÁO CÁO CUỐ BUỔI", "BÁO CÁO CUỐI BUI"),
    attendanceStart: entry(MESSAGE_TITLES.attendanceStart, "ĐIỂM DANH ĐẦU BUỔI SÁNG", "ĐIỂM DANH BUỔI ĐẦU", "ĐIỂM DANH ĐẦU BUỔ", "ĐIỂM DANH ĐẦU BỔI", "ĐIỂM DAH ĐẦU BUỔI", "ĐIỂM DNH ĐẦU BUỔI", "ĐIỂM DANH ĐẦU BUỔII", "ĐIỂMDANH ĐẦU BUỔI", "ĐIỂM DANH ĐẦUBUỔI", "ĐIỂM DANH ĐẦU BUI", "ĐIỂM DANHH ĐẦU BUỔI", "ĐIỂM ddanh ĐẦU BUỔI"),
    attendanceEnd: entry(MESSAGE_TITLES.attendanceEnd, "ĐIỂM DANH CUỐI BUỔI CHIỀU", "ĐIỂM DANH BUỔI CUỐI", "ĐIỂM DANH CUỐI BUỔ", "ĐIỂM DANH CUỐI BỔI", "ĐIỂM DAH CUỐI BUỔI", "ĐIỂM DNH CUỐI BUỔI", "ĐIỂM DANH CUỐI BUỔII", "ĐIỂMDANH CUỐI BUỔI", "ĐIỂM DANH CUỐIBUỔI", "ĐIỂM DANH CUỐ BUỔI", "ĐIỂM DANH CUỐI BUI", "ĐIỂM DANHH CUỐI BUỔI"),
    shiftStart: entry(MESSAGE_TITLES.shiftStart, "CÔNG VIỆC ĐẦU CA", "CÔNG VIỆC ĐẦU CA LÀM VIỆC", "CÔNG VIỆC ĐẦU CA LÀ", "CÔNG VIỆC ĐẦU CA LM", "CÔNG VIỆC ĐẦU C LÀM", "CÔNG VIỆC ĐẦU CAA LÀM", "CÔNG VIỆC ĐẦU CALÀM", "CÔNG VIỆC ĐẦUCA LÀM", "CÔNGVIỆC ĐẦU CA LÀM", "CÔNG VIỆ ĐẦU CA LÀM", "CÔNG VIỆC ĐẦU CA LÀMM", "CÔNG VỆC ĐẦU CA LÀM", "CÔN VIỆC ĐẦU CA LÀM"),
    shiftEnd: entry(MESSAGE_TITLES.shiftEnd, "CÔNG VIỆC CUỐI CA", "CÔNG VIỆC CUỐI CA LÀM VIỆC", "CÔNG VIỆC CUỐI CA LÀ", "CÔNG VIỆC CUỐI CA LM", "CÔNG VIỆC CUỐI C LÀM", "CÔNG VIỆC CUỐI CAA LÀM", "CÔNG VIỆC CUỐI CALÀM", "CÔNG VIỆC CUỐICA LÀM", "CÔNGVIỆC CUỐI CA LÀM", "CÔNG VIỆ CUỐI CA LÀM", "CÔNG VIỆC CUỐ CA LÀM", "CÔNG VIỆC CUỐI CA LÀMM", "CÔNG VỆC CUỐI CA LÀM", "CÔN VIỆC CUỐI CA LÀM", "CÔNG VIỆC KẾT CA LÀM"),
    electric: entry(MESSAGE_TITLES.electric, "LỖI ĐIỆ", "LỖ ĐIỆN", "LỖIĐIỆN", "LỖI ĐIỆNN", "LỖI ĐIN", "LỖII ĐIỆN", "LỖI ĐỆN", "LỖI ddiện"),
} as const satisfies Record<string, SpellingEntry>;

/**
 * Cấp học ở đầu tên trường của form trường ("TH - THCS - THPT Hải Đăng"), từng mã riêng. Chỉ ghi dạng sai không thể là chữ đầu của một tên trường thật
 * ("Tiểu", "HT", "MM", "NM" bị loại vì "Tiểu Hoa", "MM Garden" có thể là tên). Tên đầy đủ cũng ghi ở đây ("Tiểu học" ra "TH").
 */
export const LEVEL_ALIASES = {
    TH: entry("TH", "TiH", "Tiểu học", "TTH"),
    THCS: entry("THCS", "Trung học cơ sở", "THSC", "TCHS", "THCCS", "THCSS", "T.H.C.S"),
    THPT: entry("THPT", "Trung học phổ thông", "PTTH", "TPHT", "THTP", "THPPT", "THPTT", "TNPT"),
    MN: entry("MN", "Mầm non", "MNN"),
    LC: entry("LC", "Liên cấp", "LCC", "L.C"),
    LC1: entry("LC1", "Liên cấp 1", "LC 1"),
    LC2: entry("LC2", "Liên cấp 2", "LC 2"),
    LC3: entry("LC3", "Liên cấp 3", "LC 3"),
    CĐ: entry("CĐ", "Cao đẳng"),
    ĐH: entry("ĐH", "Đại học"),
} as const satisfies Record<string, SpellingEntry>;

/** Giá trị dòng "Cấp" của form IT, viết số La Mã (I = TH, II = THCS, III = THPT; LC giữ nguyên). Người gõ hay thay chữ I bằng số hoặc chữ l. */
export const IT_LEVEL_VALUES = {
    I: entry("I", "1", "l"),
    II: entry("II", "2", "ll"),
    III: entry("III", "3", "lll"),
    LC: entry("LC", "Liên cấp", "LCC"),
} as const satisfies Record<string, SpellingEntry>;

/**
 * Xếp loại của ba dòng "Tình trạng" của form trường (Netsupport, Âm thanh, Máy lạnh). Chỉ khớp CẢ giá trị. Không áp cho LỖI ĐIỆN (chữ khác T/B/K là HIỆN TRẠNG)
 * và không áp cho form IT (chép nguyên văn); "K" ở dòng khác có thể là "không".
 */
export const GRADE_VALUES = {
    T: entry("T", "Tốt", "Hoạt động tốt", "OK"),
    B: entry("B", "Bình thường", "Trung bình", "TB", "BT", "Bth", "Bthg"),
    K: entry("K", "Kém", "Không tốt", "Không hoạt động", "Ko hoạt động", "Hỏng", "Lỗi", "Yếu", "Xấu"),
} as const satisfies Record<string, SpellingEntry>;

/** Giá trị nghĩa là "không có gì" ở các dòng liệt kê hoặc đếm (Thực tập IT, Tên Trợ giảng, Nhân viên vắng, Phân hiệu). */
export const NONE_VALUES = entry("Không", "0", "Ko", "K", "Kh", "Khg", "Hok", "Hông", "Không có", "Ko có", "Chưa có", "Chưa có thông tin", "N/A", "NA", "Trống", "Không ai", "None");
