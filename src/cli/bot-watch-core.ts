import { watch } from "../watch/watch.js";
import { requireLicense } from "../core/licenseGate.js";

/**
 * Bản lõi của `bot:watch` (không chat, không đọc ảnh): chỉ phát hiện tin mới và xếp nhóm vào hàng chờ cào.
 * Đây là điểm vào của bản bán. Xem src/watch/watch.ts.
 */
requireLicense();
watch().catch((err) => {
    console.error(err);
    process.exit(1);
});
