import { loadReportSets } from "../reportSets/cliSet.js";
import type { PhotoRule } from "../types/index.js";

/** Luật đọc ảnh nào phục vụ báo cáo nào: luật không có báo cáo nào đang bật thì không đọc (đỡ tốn token, không sinh dòng "cần xem" vô ích). */
export const REPORT_OF_RULE: Record<string, string> = { leave: "leave", bienban: "minutes" };

/** Chỉ giữ luật mà báo cáo của nó nằm trong `enabledReports`; luật không có trong bảng trên luôn được giữ. Hàm thuần. */
export function filterRulesByReports(rules: PhotoRule[], enabledReports: string[]): PhotoRule[] {
    return rules.filter((r) => REPORT_OF_RULE[r.id] === undefined || enabledReports.includes(REPORT_OF_RULE[r.id]));
}

/**
 * Các luật cần đọc theo `config.reportSets` (báo cáo của mọi bộ đang chạy). Không bộ nào bật báo cáo ảnh nào thì trả đủ luật, để lệnh chạy tay vẫn đọc được.
 */
export function enabledRules(rules: PhotoRule[]): PhotoRule[] {
    const reports = loadReportSets().active.flatMap((s) => s.reports as string[]);
    const kept = filterRulesByReports(rules, reports);
    return kept.length > 0 ? kept : rules;
}
