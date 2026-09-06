const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  syncProgress: progress => ipcRenderer.send("progress:update", progress),
  showTestReminder: () => ipcRenderer.invoke("reminder:test"),
  getReminderSettings: () => ipcRenderer.invoke("reminder:settings")
});
