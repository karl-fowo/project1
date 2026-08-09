const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kb", {
  bootstrap: () => ipcRenderer.invoke("kb:bootstrap"),
  ask: (question) => ipcRenderer.invoke("kb:ask", { question })
});
