import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS, type PanelApi } from '@shared/ipc'

/** Subscribes to a main-process event and returns the function that removes the listener. */
function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: unknown, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: PanelApi = {
  projectGet: () => ipcRenderer.invoke(CHANNELS.projectGet),
  projectChoose: () => ipcRenderer.invoke(CHANNELS.projectChoose),
  status: () => ipcRenderer.invoke(CHANNELS.status),
  startBot: (id) => ipcRenderer.invoke(CHANNELS.startBot, id),
  stopBot: (id, pid) => ipcRenderer.invoke(CHANNELS.stopBot, id, pid),
  runJob: (request) => ipcRenderer.invoke(CHANNELS.runJob, request),
  configLoad: () => ipcRenderer.invoke(CHANNELS.configLoad),
  configSave: (overlay) => ipcRenderer.invoke(CHANNELS.configSave, overlay),
  licenseGet: () => ipcRenderer.invoke(CHANNELS.licenseGet),
  licenseImport: (sourcePath) => ipcRenderer.invoke(CHANNELS.licenseImport, sourcePath),
  licensePick: () => ipcRenderer.invoke(CHANNELS.licensePick),
  setTheme: (theme) => ipcRenderer.invoke(CHANNELS.setTheme, theme),
  onLog: (cb) => on(CHANNELS.log, cb),
  onBotExit: (cb) => on(CHANNELS.botExit, cb),
  onJobState: (cb) => on(CHANNELS.jobState, cb),
  onUpdateDownloaded: (cb) => on(CHANNELS.updateDownloaded, cb)
}

contextBridge.exposeInMainWorld('api', api)
