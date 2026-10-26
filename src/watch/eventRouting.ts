import type { RealtimeMessageEvent } from "../types/index.js";
import type { WatchExtensions } from "./extensions.js";

/**
 * Một tin từ khung WebSocket: hỏi móc (nếu có) rồi xếp nhóm vào hàng chờ cào. Móc ném lỗi thì ghi cảnh báo
 * và vẫn xếp hàng, để phần chat/ảnh không bao giờ làm mất việc phát hiện tin. Không biết nhóm (`target` rỗng) thì không xếp.
 */
export function handleRealtimeEvent(args: {
    event: RealtimeMessageEvent;
    target: string | undefined;
    ext: WatchExtensions;
    enqueue(target: string, tag: string): void;
}): void {
    const { event, target, ext, enqueue } = args;
    let queue = true;
    if (ext.onEvent) {
        try {
            queue = ext.onEvent(event, target).queue;
        } catch (err) {
            console.warn(`[watch] móc mở rộng lỗi, nhóm vẫn được xếp hàng cào: ${(err as Error).message}`);
        }
    }
    if (!queue || !target) return;
    console.log(`[watch] realtime-ws: new message detected for "${target}" (groupId=${event.groupId})`);
    enqueue(target, "realtime-ws");
}
