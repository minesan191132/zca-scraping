import type { RealtimeMessageEvent } from "../types/index.js";

/**
 * Móc để phần nghiệp vụ (chat, đọc ảnh) bám vào `bot:watch` mà thư mục `watch/` không phải import chúng.
 * Bản bán không truyền gì: watch chỉ phát hiện tin và xếp hàng cào.
 */
export interface WatchExtensions {
    /** Gọi cho mỗi tin trước khi xếp hàng; trả { queue:false } để không xếp (vd tin dội lại của bot chat, nhóm chỉ-chat). Mặc định: xếp khi biết nhóm. */
    onEvent?(event: RealtimeMessageEvent, target: string | undefined): { queue: boolean };
}
