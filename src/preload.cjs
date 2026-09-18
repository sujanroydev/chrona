const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chrona", {
  getState: () => ipcRenderer.invoke("get-state"),
  toggleTracking: (value) => ipcRenderer.send("toggle-tracking", value),
  onState: (callback) => {
    ipcRenderer.on("state", (_, state) => callback(state));
  },
});
