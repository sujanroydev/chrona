const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chrona", {
  getState: () => ipcRenderer.invoke("get-state"),
  getUsageHistory: (days) => ipcRenderer.invoke("get-usage-history", days),
  getDayUsage: (date) => ipcRenderer.invoke("get-day-usage", date),
  toggleTracking: (value) => ipcRenderer.send("toggle-tracking", value),
  onState: (callback) => {
    ipcRenderer.on("state", (_, state) => callback(state));
  },
});
