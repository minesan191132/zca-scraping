import { test } from "node:test";
import assert from "node:assert/strict";
import {
    ELECTRIC_LABELS, GRADE_VALUES, IT_ATTENDANCE_LABELS, IT_LEVEL_VALUES, IT_SHIFT_END_LABELS, IT_SHIFT_START_LABELS, LEVEL_ALIASES, NONE_VALUES,
    SCHOOL_FORM_IGNORED_LABELS, SCHOOL_FORM_LABELS, SCHOOL_HEADER_LABELS, TITLE_ALIASES, type SpellingEntry,
} from "../src/constants/spellingAliases.js";
import { classifyTitle, fold, parseLines } from "../src/lesson/parseReport.js";
import { classifyTechTitle, parseTechRow, type TechKey } from "../src/lesson/techReport.js";
import { classifyElectricTitle, parseElectricMessage } from "../src/lesson/electricReport.js";

// Bước so khớp mạnh nhất của các parser hiện có (labelKey của techReport): ký tự không phải chữ số hay chữ cái thành một khoảng trắng. Hai mục đụng nhau ở đây là đụng nhau ở mọi parser.
const key = (s: string): string => fold(s).replace(/[^a-z0-9]+/g, " ").trim();

type Scope = Record<string, SpellingEntry>;

const SCOPES: Record<string, Scope> = {
    "form trường": { ...SCHOOL_HEADER_LABELS, ...SCHOOL_FORM_LABELS, ...SCHOOL_FORM_IGNORED_LABELS },
    "IT điểm danh": { ...SCHOOL_HEADER_LABELS, ...IT_ATTENDANCE_LABELS },
    "IT đầu ca": { ...SCHOOL_HEADER_LABELS, ...IT_SHIFT_START_LABELS },
    "IT cuối ca": { ...SCHOOL_HEADER_LABELS, ...IT_SHIFT_END_LABELS },
    "LỖI ĐIỆN": ELECTRIC_LABELS,
    "tiêu đề": TITLE_ALIASES,
    "cấp học form trường": LEVEL_ALIASES,
    "cấp La Mã form IT": IT_LEVEL_VALUES,
    "xếp loại": GRADE_VALUES,
    "giá trị không có": { none: NONE_VALUES },
};

for (const [scopeName, scope] of Object.entries(SCOPES)) {
    test(`bảng lỗi chính tả "${scopeName}": không dư, không trùng, không đụng mục khác`, () => {
        const owner = new Map<string, string>();
        for (const [name, e] of Object.entries(scope)) {
            const k = key(e.canonical);
            assert.ok(k !== "", `${name}: canonical rỗng`);
            assert.equal(owner.get(k), undefined, `${name}: canonical "${e.canonical}" trùng với ${owner.get(k)}`);
            owner.set(k, name);
        }
        for (const [name, e] of Object.entries(scope)) {
            const own = key(e.canonical);
            const seen = new Set<string>();
            for (const v of e.variants) {
                const k = key(v);
                assert.ok(k !== "", `${name}: biến thể rỗng "${v}"`);
                assert.notEqual(k, own, `${name}: "${v}" chỉ khác canonical "${e.canonical}" ở dấu, hoa thường hay dấu câu, bỏ đi`);
                assert.ok(!seen.has(k), `${name}: "${v}" lặp lại một biến thể khác của cùng mục`);
                seen.add(k);
                const taken = owner.get(k);
                assert.equal(taken, undefined, `${name}: "${v}" trùng với ${taken}`);
            }
            for (const k of seen) owner.set(k, name);
        }
    });
}

test("tiêu đề: biến thể của ĐẦU không chứa CUỐI và ngược lại", () => {
    for (const name of ["schoolStart", "attendanceStart", "shiftStart"] as const) {
        for (const v of [TITLE_ALIASES[name].canonical, ...TITLE_ALIASES[name].variants]) assert.ok(!key(v).includes("cuoi"), `${name}: "${v}" chứa CUỐI`);
    }
    for (const name of ["schoolEnd", "attendanceEnd", "shiftEnd"] as const) {
        for (const v of [TITLE_ALIASES[name].canonical, ...TITLE_ALIASES[name].variants]) assert.ok(!key(v).includes("dau"), `${name}: "${v}" chứa ĐẦU`);
    }
});

// Dạng đúng phải đúng là cái parser hiện tại đọc, để bảng bám vào code trước khi có chỗ nào dùng nó.
test("form trường: mỗi canonical rơi vào đúng khóa của parseLines, dòng bỏ qua không thành nhãn lạ", () => {
    for (const [field, e] of Object.entries(SCHOOL_FORM_LABELS)) {
        const { values, unknownLabels } = parseLines(`BÁO CÁO CUỐI BUỔI\n- ${e.canonical}: giá trị`);
        assert.equal(values[field as keyof typeof values], "giá trị", `${field}: "${e.canonical}"`);
        assert.deepEqual(unknownLabels, [], `${field}`);
    }
    for (const [field, e] of Object.entries(SCHOOL_FORM_IGNORED_LABELS)) {
        const { values, unknownLabels } = parseLines(`BÁO CÁO CUỐI BUỔI\n- ${e.canonical}: giá trị`);
        assert.deepEqual(values, {}, `${field}`);
        assert.deepEqual(unknownLabels, [], `${field}`);
    }
    const school = parseLines("BÁO CÁO CUỐI BUỔI\n- Tên Trường: A\n- Phân hiệu: CS1");
    assert.equal(school.values.tenTruong, "A");
    assert.equal(school.values.phanHieu, "CS1");
});

const row = (title: TechKey, lines: string[], ts = 0): Record<string, unknown> | null => parseTechRow(title, `x\n- Tên Trường: X\n${lines.map((l) => `- ${l}`).join("\n")}`, ts);

test("form IT: bốn dòng đầu rơi đúng cột ở cả ba form", () => {
    const cols = { cap: ["B", "I"], tenTruong: ["C", "X"], phanHieu: ["D", "CS2"], phuongXa: ["E", "Q6"] } as const;
    for (const k of ["attendanceStart", "shiftStart", "shiftEnd"] as const) {
        for (const [field, [col, value]] of Object.entries(cols)) {
            const e = SCHOOL_HEADER_LABELS[field as keyof typeof SCHOOL_HEADER_LABELS];
            const out = field === "tenTruong" ? parseTechRow(k, `x\n- ${e.canonical}: ${value}`, 0) : row(k, [`${e.canonical}: ${value}`]);
            assert.equal(out?.[col], value, `${k} ${field}: "${e.canonical}"`);
        }
    }
});

test("form IT: mỗi canonical rơi vào đúng cột của techReport", () => {
    const check = (k: TechKey, labels: Scope, expect: Record<string, [string, string, string | number]>): void => {
        for (const [field, [col, sample, want]] of Object.entries(expect)) {
            const out = row(k, [`${labels[field].canonical}: ${sample}`]);
            assert.equal(out?.[col], want, `${k} ${field}: "${labels[field].canonical}"`);
        }
    };
    check("attendanceStart", IT_ATTENDANCE_LABELS, {
        thoiGian: ["F", "9:00", 0.375], tongIT: ["G", "3", 3], tenIT: ["H", "Minh", "Minh"], thucTap: ["I", "An, Bình", "- An\n- Bình"], vang: ["J", "2", 2],
    });
    check("shiftStart", IT_SHIFT_START_LABELS, {
        truongNhom: ["F", "Minh", "Minh"], batDau: ["G", "9:00", 0.375], pmTruong: ["H", "PM1", 1], pmCongTy: ["I", "PM2", 2], pmLamViec: ["J", "PM3", 3], congViec: ["K", "Bảo trì", "Bảo trì"],
    });
    check("shiftEnd", IT_SHIFT_END_LABELS, {
        truongNhom: ["F", "Minh", "Minh"], ketThuc: ["G", "11:30", 690 / 1440], pmLamViec: ["H", "PM3", 3], tongMay: ["I", "50", 50], mayHoatDong: ["J", "49", 49], mayLoi: ["K", "1", 1],
        hdh: ["L", "Windows 10", "Windows 10"], office: ["M", "2019", "2019"], netSupport: ["N", "T", "T"], amThanh: ["O", "B", "B"], tocDo: ["P", "45 mbps", 45],
        mayLanh: ["Q", "Media tốt", "- Media tốt"], camera: ["R", "1 hoạt động", 1], veSinh: ["S", "S", "S"], baoTri: ["T", "R", "R"], hinhAnh: ["U", "C", "C"],
    });
});

test("form IT cuối ca: hai dòng đọc nhưng không vào cột nào không làm hỏng việc đọc", () => {
    const out = row("shiftEnd", [`${IT_SHIFT_END_LABELS.congViecHoanThanh.canonical}:`, `${IT_SHIFT_END_LABELS.yKien.canonical}: ổn`]);
    assert.ok(out !== null);
});

test("LỖI ĐIỆN: mỗi canonical rơi vào đúng trường của parseElectricMessage", () => {
    const text = `LỖI ĐIỆN\n- ${ELECTRIC_LABELS.truong.canonical}: A\n- ${ELECTRIC_LABELS.khuVuc.canonical}: B\n- ${ELECTRIC_LABELS.phongMay.canonical}: PM1\n- ${ELECTRIC_LABELS.tinhTrang.canonical}: K`;
    assert.deepEqual(parseElectricMessage(text), [{ tenTruong: "A", khuVuc: "B", phongMay: "PM1", tinhTrang: "K" }]);
});

test("tiêu đề: mỗi canonical được bộ phân loại hiện tại nhận", () => {
    assert.equal(classifyTitle(`${TITLE_ALIASES.schoolStart.canonical}\n- Tên Giáo viên: A`), "DauBuoi");
    assert.equal(classifyTitle(`${TITLE_ALIASES.schoolEnd.canonical}\n- Tên Giáo viên: A`), "CuoiBuoi");
    assert.equal(classifyTechTitle(TITLE_ALIASES.attendanceStart.canonical), "attendanceStart");
    assert.equal(classifyTechTitle(TITLE_ALIASES.attendanceEnd.canonical), "attendanceEnd");
    assert.equal(classifyTechTitle(TITLE_ALIASES.shiftStart.canonical), "shiftStart");
    assert.equal(classifyTechTitle(TITLE_ALIASES.shiftEnd.canonical), "shiftEnd");
    assert.equal(classifyElectricTitle(TITLE_ALIASES.electric.canonical), true);
});
