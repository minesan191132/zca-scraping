import type { PanelApi } from '@shared/ipc'

declare global {
  interface Window {
    api: PanelApi
    /** set by the renderer once the first status poll and the config are in; the screenshot hook waits for it */
    __panelReady?: boolean
  }
}

export {}
