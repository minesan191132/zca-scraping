import type { BotId } from '@shared/bots'
import { t } from '$lib/i18n/index.svelte'
import { project } from '$lib/stores/project.svelte'

// Ở bản cài, bộ "runner" thực ra là bộ điều phối mỏng: chỉ cào, không đồng bộ CSDL hay dựng file Excel. Tên và mô tả của bản đầy đủ sẽ nói sai.

export const botName = (id: BotId): string =>
  id === 'runner' && project.bundled ? t('bot.runner.nameBundled') : t(`bot.${id}.name`)

export const botDesc = (id: BotId): string =>
  id === 'runner' && project.bundled ? t('bot.runner.descBundled') : t(`bot.${id}.desc`)
