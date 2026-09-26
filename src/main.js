import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isUserActive, getForegroundApplication } from "./windows.js";
import {
  addUsage,
  recordApplicationSession,
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

// Chrona is a single-instance application. Without this lock, every launch
// (including repeated startup/task-scheduler launches) creates another
// tracker, which can duplicate tracking and create multiple tray icons.
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

app.on("second-instance", (_event, commandLine) => {
  // A startup launch uses --hidden. If Chrona is already running, simply
  // ignore duplicate hidden launches instead of opening another window.
  if (commandLine.includes("--hidden")) return;

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

let mainWindow;
let tray;
let timer;
let lastCheck = Date.now();
let running = true;
let currentApplication = null;
let currentApplicationOpen = false;
let currentApplicationOpenedAt = null;

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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (/^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
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
      if (
        currentApplicationOpen &&
        currentApplication &&
        currentApplicationOpenedAt
      ) {
        const closedAt = Date.now();
        recordApplicationSession(
          currentApplication,
          currentApplicationOpenedAt,
          closedAt,
        );
      }

      currentApplication = application;
      currentApplicationOpenedAt = Date.now();
      currentApplicationOpen = true;
    }
  } else if (currentApplicationOpen && currentApplication) {
    const closedAt = Date.now();
    if (currentApplicationOpenedAt) {
      recordApplicationSession(
        currentApplication,
        currentApplicationOpenedAt,
        closedAt,
      );
    }
    currentApplicationOpen = false;
    currentApplication = null;
    currentApplicationOpenedAt = null;
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
          const closedAt = Date.now();
          if (currentApplicationOpenedAt) {
            recordApplicationSession(
              currentApplication,
              currentApplicationOpenedAt,
              closedAt,
            );
          }
          currentApplicationOpen = false;
          currentApplication = null;
          currentApplicationOpenedAt = null;
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

ipcMain.handle("open-external", (_, url) => {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    throw new Error("Invalid external URL");
  }

  return shell.openExternal(url);
});

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

  const result = getApplicationUsage(application, days);
  if (
    currentApplicationOpen &&
    currentApplication === application &&
    currentApplicationOpenedAt
  ) {
    const now = Date.now();
    const start = currentApplicationOpenedAt;
    for (const day of result.days) {
      const dayStart = new Date(`${day.date}T00:00:00`).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const open = Math.max(start, dayStart);
      const close = Math.min(now, dayEnd);
      if (close > open) day.sessions.push({ open, close, live: true });
    }
    result.sessions = result.days.reduce(
      (sum, day) => sum + day.sessions.length,
      0,
    );
  }
  return result;
});

ipcMain.handle("get-day-usage", (_, date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date");
  }

  const result = getDayUsage(date);
  if (
    currentApplicationOpen &&
    currentApplication &&
    currentApplicationOpenedAt
  ) {
    const now = Date.now();
    const dayStart = new Date(`${date}T00:00:00`).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const open = Math.max(currentApplicationOpenedAt, dayStart);
    const close = Math.min(now, dayEnd);
    if (close > open) {
      const liveSession = {
        open,
        close,
        application: currentApplication,
        live: true,
      };
      result.sessions.push(liveSession);
      result.activeSessions.push({ open, close, live: true });
      result.sessions.sort((a, b) => a.open - b.open);
      result.activeSessions.sort((a, b) => a.open - b.open);
    }
  }
  return result;
});

ipcMain.on("toggle-tracking", (_, value) => {
  if (!value && currentApplicationOpen && currentApplication) {
    const closedAt = Date.now();
    if (currentApplicationOpenedAt) {
      recordApplicationSession(
        currentApplication,
        currentApplicationOpenedAt,
        closedAt,
      );
    }
    currentApplicationOpen = false;
    currentApplication = null;
    currentApplicationOpenedAt = null;
  }
  running = value;
  lastCheck = Date.now();
  updateUI();
});

app.whenReady().then(() => {
  app.setAppUserModelId("in.sujanroy.chrona");

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

app.on("before-quit", () => {
  if (
    currentApplicationOpen &&
    currentApplication &&
    currentApplicationOpenedAt
  ) {
    const closedAt = Date.now();
    recordApplicationSession(
      currentApplication,
      currentApplicationOpenedAt,
      closedAt,
    );
    currentApplicationOpen = false;
    currentApplication = null;
    currentApplicationOpenedAt = null;
  }
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});
