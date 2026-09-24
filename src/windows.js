import koffi from "koffi";
import { execFileSync } from "node:child_process";

const user32 = koffi.load("user32.dll");
const kernel32 = koffi.load("kernel32.dll");

const LASTINPUTINFO = koffi.struct("LASTINPUTINFO", {
  cbSize: "uint32",
  dwTime: "uint32",
});

const GetLastInputInfo = user32.func(
  "bool __stdcall GetLastInputInfo(_Inout_ LASTINPUTINFO *plii)",
);

const GetTickCount = kernel32.func("uint32 __stdcall GetTickCount()");

const GetForegroundWindow = user32.func("HWND __stdcall GetForegroundWindow()");

const GetWindowThreadProcessId = user32.func(
  "uint32 __stdcall GetWindowThreadProcessId(HWND hWnd, uint32 *lpdwProcessId)",
);

const GetWindowTextW = user32.func(
  "int __stdcall GetWindowTextW(HWND hWnd, _Out_ uint16 *lpString, int nMaxCount)",
);

export function getIdleTime() {
  const info = {
    cbSize: koffi.sizeof(LASTINPUTINFO),
    dwTime: 0,
  };

  if (!GetLastInputInfo(info)) {
    throw new Error("GetLastInputInfo failed");
  }

  const current = GetTickCount();
  return (current - info.dwTime) >>> 0;
}

export function isUserActive(thresholdMs) {
  try {
    return getIdleTime() < thresholdMs;
  } catch {
    return false;
  }
}

function readWindowTitle(hwnd) {
  const buffer = new Uint16Array(512);
  const length = GetWindowTextW(hwnd, buffer, buffer.length);

  if (!length) return "";
  return String.fromCharCode(...buffer.subarray(0, length));
}

const processCache = new Map();

function getProcessName(pid) {
  if (!pid) return null;
  if (processCache.has(pid)) return processCache.get(pid);

  try {
    const result = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessName`,
      ],
      { windowsHide: true, encoding: "utf8", timeout: 1500 },
    ).trim();

    const name = result.split(/\r?\n/).find(Boolean)?.trim();
    if (name) {
      processCache.set(pid, name);
      return name;
    }
  } catch {
    // The foreground process may have exited between the API calls.
  }

  return null;
}

let lastForegroundPid = 0;
let lastForegroundApp = "Unknown";

export function getForegroundApplication() {
  try {
    const hwnd = GetForegroundWindow();
    if (!hwnd) return "Unknown";

    const pidBuffer = new Uint32Array(1);
    GetWindowThreadProcessId(hwnd, pidBuffer);
    const pid = pidBuffer[0];

    if (pid === lastForegroundPid && lastForegroundApp) {
      return lastForegroundApp;
    }

    const processName = getProcessName(pid);
    const title = readWindowTitle(hwnd);
    const appName = processName || title || "Unknown";

    lastForegroundPid = pid;
    lastForegroundApp = appName.replace(/\.exe$/i, "");

    return lastForegroundApp;
  } catch {
    return "Unknown";
  }
}
