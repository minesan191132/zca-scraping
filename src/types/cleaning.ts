// VỆ SINH PHÒNG MÁY — xem docs/superpowers/specs/2026-09-30-ve-sinh-vi-pham-design.md

/** Một dòng dữ liệu vệ sinh (= một tin "CÔNG VIỆC CUỐI CA LÀM", mỗi tin một phòng máy). */
export interface CleaningEntry {
    maNhom: string;
    maTinNhan: string;
    thoiGian: number;
    tenTruong: string;
    khuVuc: string;
    phongMay: string;
    tenIT: string;
}
