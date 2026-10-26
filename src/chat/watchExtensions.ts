import type { WatchExtensions } from "../watch/extensions.js";
import { routeMessageSafe } from "./fanout.js";
import { appendInbox } from "./inbox.js";
import { makeChatGroupsReader } from "./rules.js";
import { consumeEcho } from "./state.js";
import { downloadImageFromUrl } from "../store/imageStore.js";
import { visionGroups } from "../vision/groups.js";

/**
 * Phần nghiệp vụ của tác giả gắn vào `bot:watch`: chia tin vào hộp thư chat (`bot:chat`), bỏ tin bot chat tự gửi dội lại,
 * và tải ảnh của nhóm đọc ảnh. Bản bán không có file này trong gói.
 */
export function authorExtensions(): WatchExtensions {
    const chatGroups = makeChatGroupsReader();
    return {
        onEvent(event, target) {
            const groups = chatGroups();
            const route = routeMessageSafe(
                {
                    event,
                    target,
                    allowedGroups: groups.allowed,
                    noScrapeGroups: groups.noScrape,
                    consumeEcho: (t, text) => consumeEcho(t, text, Date.now()),
                },
                (err) => console.warn(`[watch] chat routing failed, the group is still queued for scraping: ${err.message}`),
            );
            if (route.inbox) {
                try {
                    appendInbox(route.inbox);
                    console.log(`[watch] chat inbox: "${route.inbox.groupName}" message ${route.inbox.msgId}`);
                } catch (err) {
                    console.warn(`[watch] could not write the chat inbox: ${(err as Error).message}`); // never let chat break detection
                }
            }
            // Ảnh của nhóm đọc ảnh (nghỉ phép, đo tốc độ): tải ngay từ đường dẫn ảnh gốc trong khung WS. Zalo chỉ lưu ảnh gốc vào bộ nhớ tạm khi ảnh được mở; ảnh trong ALBUM chỉ có
            // bản thu nhỏ nên lần cào sau không lấy được gì. File lưu cùng tên với bản cào (msgId) nên lần cào sau thấy ảnh đã có và gắn đường dẫn vào dòng tin. Lỗi chỉ ghi cảnh báo.
            const photo = event.photoMessage;
            if (photo && !photo.isSelf && target && visionGroups().includes(target)) {
                void downloadImageFromUrl(event.groupId, photo.msgId, photo.url).catch((err) => console.warn(`[watch] could not save the photo ${photo.msgId}: ${(err as Error).message}`));
            }
            return { queue: route.queue };
        },
    };
}
