import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("nyandeck", {
  getServerUrl: (): Promise<string> => ipcRenderer.invoke("get-server-url"),
  setServerUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke("set-server-url", url),
});
