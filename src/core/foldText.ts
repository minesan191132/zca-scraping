export function stripDiacritics(s: string): string {
    return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

export const fold = (s: string): string => stripDiacritics(s).toLowerCase().replace(/\s+/g, " ").trim();
