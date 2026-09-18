import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isUserActive } from "./windows.js";
import { addUsage, getUsage } from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHECK_INTERVAL = 10_000;
const IDLE_LIMIT = 5 * 60 * 1000;

let mainWindow;
let tray;
let timer;
let lastCheck = Date.now();
let running = true;

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 430,
    height: 570,
    minWidth: 380,
    minHeight: 500,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    title: "Laptop Time",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function updateUI() {
  const usage = getUsage();
  const active = running && isUserActive(IDLE_LIMIT);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("state", {
      today: usage.today,
      yesterday: usage.yesterday,
      week: usage.week,
      active,
      tracking: running
    });
  }

  if (tray) {
    tray.setToolTip(`Laptop Time — Today: ${formatTime(usage.today)}`);
  }
}

function track() {
  const now = Date.now();
  const elapsed = Math.max(0, Math.min(now - lastCheck, 60_000));
  lastCheck = now;

  if (running && isUserActive(IDLE_LIMIT)) {
    addUsage(elapsed / 1000);
  }

  updateUI();
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());

  const menu = Menu.buildFromTemplate([
    {
      label: "Open Laptop Time",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: "Pause tracking",
      click: () => {
        running = false;
        updateUI();
      }
    },
    {
      label: "Resume tracking",
      click: () => {
        running = true;
        lastCheck = Date.now();
        updateUI();
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(menu);
  tray.on("double-click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

ipcMain.handle("get-state", () => {
  const usage = getUsage();
  return {
    ...usage,
    active: running && isUserActive(IDLE_LIMIT),
    tracking: running
  };
});

ipcMain.on("toggle-tracking", (_, value) => {
  running = value;
  lastCheck = Date.now();
  updateUI();
});

app.whenReady().then(() => {
  app.setAppUserModelId("in.knowlet.laptoptime");

  // Start with Windows after installation.
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
    args: ["--hidden"]
  });

  createWindow();
  createTray();

  timer = setInterval(track, CHECK_INTERVAL);
  updateUI();

  if (process.argv.includes("--hidden")) {
    mainWindow.hide();
  } else {
    mainWindow.show();
  }
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});
