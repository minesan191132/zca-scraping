import { watch } from "../watch/watch.js";

/**
 * Bản lõi của `bot:watch` (không chat, không đọc ảnh): chỉ phát hiện tin mới và xếp nhóm vào hàng chờ cào.
 * Đây là điểm vào của bản bán. Xem src/watch/watch.ts.
 */
watch().catch((err) => {
    console.error(err);
    process.exit(1);
});
