import type { BotId } from '@shared/bots'
import { placementOf, type GeneralTab } from '@shared/settings-map'

export type BotTab = 'status' | 'logs' | 'settings'
export type GeneralPage = GeneralTab | 'project'

export type Page =
  | { name: 'home' }
  | { name: 'bot'; id: BotId; tab: BotTab }
  | { name: 'jobs' }
  | { name: 'general'; tab: GeneralPage }

let page = $state<Page>({ name: 'home' })
/** a setting the settings view should scroll to and highlight */
let focus = $state<string | null>(null)

export const nav = {
  get page(): Page {
    return page
  },
  get focus(): string | null {
    return focus
  },
  clearFocus(): void {
    focus = null
  },
  go(next: Page): void {
    page = next
  },
  /** switch the tab of the page that is open */
  tab(tab: BotTab | GeneralPage): void {
    if (page.name === 'bot') page = { ...page, tab: tab as BotTab }
    else if (page.name === 'general') page = { ...page, tab: tab as GeneralPage }
  },
  /** open the page and tab where a setting lives, and ask the view to highlight it */
  reveal(path: string): void {
    const at = placementOf(path)
    page =
      at.page === 'general'
        ? { name: 'general', tab: at.tab ?? 'zalo' }
        : { name: 'bot', id: at.page, tab: 'settings' }
    focus = path
  }
}
