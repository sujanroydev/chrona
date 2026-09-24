import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isUserActive, getForegroundApplication } from "./windows.js";
import {
  addUsage,
  recordApplicationEvent,
  getUsage,
  getRecentUsage,
  getDayUsage,
  getApplicationUsage,
} from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconPath = path.join(__dirname, "assets/icon.png");
const trayPath = path.join(__dirname, "assets/tray.png");

const CHECK_INTERVAL = 10_000;
const IDLE_LIMIT = 5 * 60 * 1000;

let mainWindow;
let tray;
let timer;
let lastCheck = Date.now();
let running = true;
let currentApplication = null;
let currentApplicationOpen = false;

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: iconPath,
    width: 760,
    height: 700,
    minWidth: 600,
    minHeight: 520,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    title: "Chrona",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
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
      tracking: running,
    });
  }

  if (tray) {
    tray.setToolTip(`Chrona — Today: ${formatTime(usage.today)}`);
  }
}

function track() {
  const now = Date.now();
  const elapsed = Math.max(0, Math.min(now - lastCheck, 60_000));
  lastCheck = now;

  const active = running && isUserActive(IDLE_LIMIT);
  const foregroundApplication = active ? getForegroundApplication() : null;

  if (active) {
    const application = foregroundApplication || "Unknown";
    addUsage(elapsed / 1000, application);

    if (!currentApplicationOpen || currentApplication !== application) {
      if (currentApplicationOpen && currentApplication) {
        recordApplicationEvent(currentApplication, "close");
      }

      currentApplication = application;
      currentApplicationOpen = true;
      recordApplicationEvent(application, "open");
    }
  } else if (currentApplicationOpen && currentApplication) {
    recordApplicationEvent(currentApplication, "close");
    currentApplicationOpen = false;
    currentApplication = null;
  }

  updateUI();
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(trayPath));

  const menu = Menu.buildFromTemplate([
    {
      label: "Open Chrona",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Pause tracking",
      click: () => {
        running = false;
        if (currentApplicationOpen && currentApplication) {
          recordApplicationEvent(currentApplication, "close");
          currentApplicationOpen = false;
          currentApplication = null;
        }
        updateUI();
      },
    },
    {
      label: "Resume tracking",
      click: () => {
        running = true;
        lastCheck = Date.now();
        updateUI();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
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
    tracking: running,
  };
});

ipcMain.handle("get-usage-history", (_, days = 30) => {
  return getRecentUsage(days);
});

ipcMain.handle("get-application-usage", (_, application, days = 30) => {
  if (typeof application !== "string" || !application.trim()) {
    throw new Error("Invalid application");
  }

  return getApplicationUsage(application, days);
});

ipcMain.handle("get-day-usage", (_, date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date");
  }

  return getDayUsage(date);
});

ipcMain.on("toggle-tracking", (_, value) => {
  if (!value && currentApplicationOpen && currentApplication) {
    recordApplicationEvent(currentApplication, "close");
    currentApplicationOpen = false;
    currentApplication = null;
  }
  running = value;
  lastCheck = Date.now();
  updateUI();
});

app.whenReady().then(() => {
  app.setAppUserModelId("in.knowlet.chrona");

  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
    args: ["--hidden"],
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
