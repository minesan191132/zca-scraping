import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRules } from "../src/vision/rules.js";
import { buildPrompt, buildResultSchema, PROMPT_VERSION, SYSTEM_PROMPT } from "../src/vision/promptSchema.js";
import { manifestOf } from "./helpers/visionFixtures.js";

const rules = loadRules();
type Obj = Record<string, any>;

test("the result schema lists the rule plus khac as an image class", () => {
    const s = buildResultSchema(rules) as Obj;
    assert.deepEqual(s.required, ["images", "extracted"]);
    assert.deepEqual(s.properties.images.items.properties.loai.enum, ["bienban", "leave", "khac"]);
    assert.deepEqual(s.properties.images.items.required, ["seq", "loai", "doTinCay"]);
    assert.deepEqual(s.properties.images.items.properties.doTinCay.enum, ["cao", "vua", "thap"]);
    assert.doesNotThrow(() => JSON.stringify(s));
});

test("each rule field becomes a value+confidence object with a nullable value, and the list items list every column", () => {
    const s = buildResultSchema(rules) as Obj;
    const leave = s.properties.extracted.properties.leave;
    assert.deepEqual(leave.required, ["ngayBaoCao", "nguoiBaoCao", "boPhan", "dong"]);
    assert.deepEqual(leave.properties.ngayBaoCao.properties.value, { type: ["string", "null"] });
    assert.deepEqual(leave.properties.ngayBaoCao.required, ["value", "doTinCay"]);
    const dong = leave.properties.dong.properties.value;
    assert.equal(dong.type, "array");
    assert.deepEqual(dong.items.required, ["hoTen", "tuGio", "tuThu", "tuNgay", "denGio", "denThu", "denNgay", "soNgay", "lyDo"]);
    assert.deepEqual(dong.items.properties.tuThu, { type: ["number", "null"] });
    assert.deepEqual(dong.items.properties.hoTen, { type: ["string", "null"] });
});

test("the prompt says the images are attached in order, and lists the rule and the field hints", () => {
    const m = manifestOf(2, { texts: [{ msgId: "t1", ts: 1, content: "Lịch\n nghỉ phép " }] });
    const p = buildPrompt(rules, m);
    assert.ok(p.includes("Có 2 ảnh") && p.includes("Ảnh 1, Ảnh 2"));
    assert.ok(!p.includes("01.jpg"), "no file paths: the images are attached");
    for (const r of rules) assert.ok(p.includes(r.nhanRa), r.id);
    assert.ok(p.includes("Ngày ghi ở"));
    assert.ok(p.includes("KHÔNG đọc bảng chú giải"));
    assert.ok(p.includes("Lịch nghỉ phép"), "text is squeezed onto one line");
    assert.ok(p.includes("khac"));
    assert.ok(p.includes("null"));
});

test("the prompt never contains a first reading, and the constants are set", () => {
    assert.equal(PROMPT_VERSION, "2");
    assert.ok(SYSTEM_PROMPT.length > 20);
    assert.ok(!buildPrompt(rules, manifestOf(1)).includes("lần một"));
});

test("the leave start and end dates are asked as printed text, copied verbatim, not as ISO dates", () => {
    const s = buildResultSchema(rules) as Obj;
    const dong = s.properties.extracted.properties.leave.properties.dong.properties.value;
    assert.deepEqual(dong.items.properties.tuNgay, { type: ["string", "null"] });
    assert.deepEqual(dong.items.properties.denNgay, { type: ["string", "null"] });
    const p = buildPrompt(rules, manifestOf(1));
    assert.ok(p.includes("chép nguyên văn"), "the prompt says to copy the printed date as it is");
    assert.ok(!p.includes("YYYY-MM-DD, cùng thứ tự"), "the old convert-it-yourself hint is gone");
});
