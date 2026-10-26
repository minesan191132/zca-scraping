// Which page and group each config key is edited on. The owner is chosen by the key prefix, so a key that several bots
// read (for example watch.heartbeatSeconds) lives on one page only; the row shows who else uses it.

export type PageId = 'watch' | 'runner' | 'chat' | 'total' | 'general'
export type GeneralTab = 'zalo' | 'groups' | 'scrape' | 'vision'

export interface Placement {
  page: PageId
  /** only for page "general" */
  tab?: GeneralTab
  /** sub-heading on the page */
  group: string
}

const GENERAL: Record<string, GeneralTab> = {
  cdpPort: 'zalo',
  zaloExePath: 'zalo',
  autoLaunchZalo: 'zalo',
  dataDir: 'zalo',
  statusExportDir: 'zalo',
  excelMaxColumnWidth: 'zalo',
  reportSets: 'groups',
  targets: 'groups',
  groupAliases: 'groups',
  recoveryIgnoreTargets: 'groups',
  sinceTs: 'scrape',
  untilTs: 'scrape',
  targetMessageCount: 'scrape',
  scrollDelayMs: 'scrape'
}

export function placementOf(path: string): Placement {
  const prefix = path.split('.')[0]
  switch (prefix) {
    case 'watch':
      return { page: 'watch', group: 'watch' }
    case 'runner':
    case 'recovery':
    case 'sessions':
    case 'phases':
      return { page: 'runner', group: prefix }
    case 'techReports':
      return { page: 'runner', group: prefix }
    case 'chat':
      return { page: 'chat', group: 'chat' }
    case 'total':
    case 'print':
      return { page: 'total', group: prefix }
    case 'vision':
      return { page: 'general', tab: 'vision', group: 'vision' }
  }
  const tab = GENERAL[path]
  if (!tab) throw new Error(`setting "${path}" has no page: add it to settings-map.ts`)
  return { page: 'general', tab, group: tab }
}

/** paths that belong to a page (and tab), in the given order */
export function pathsFor(all: readonly string[], page: PageId, tab?: GeneralTab): string[] {
  return all.filter((p) => {
    const at = placementOf(p)
    return at.page === page && (tab === undefined || at.tab === tab)
  })
}
