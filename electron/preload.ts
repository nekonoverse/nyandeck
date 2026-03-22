import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("nyandeck", {
  getServerUrl: (): Promise<string> => ipcRenderer.invoke("get-server-url"),
  setServerUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke("set-server-url", url),
  oauthLogin: (): Promise<void> => ipcRenderer.invoke("oauth-login"),
  oauthLogout: (): Promise<void> => ipcRenderer.invoke("oauth-logout"),
  oauthCheck: (): Promise<boolean> => ipcRenderer.invoke("oauth-check"),
});
