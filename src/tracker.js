import koffi from "koffi";

const user32 = koffi.load("user32.dll");
const kernel32 = koffi.load("kernel32.dll");

const LASTINPUTINFO = koffi.struct("LASTINPUTINFO", {
  cbSize: "uint",
  dwTime: "uint32",
});

const GetLastInputInfo = user32.func(
  "bool __stdcall GetLastInputInfo(_Inout_ LASTINPUTINFO *plii)",
);

const GetTickCount = kernel32.func("uint32 __stdcall GetTickCount()");

export function getIdleTime() {
  const info = {
    cbSize: koffi.sizeof(LASTINPUTINFO),
  };

  const success = GetLastInputInfo(info);

  if (!success) {
    throw new Error("Failed to get last input information");
  }

  const currentTick = GetTickCount();

  // Windows GetTickCount() wraps approximately every 49.7 days.
  const elapsed = (currentTick - info.dwTime) >>> 0;

  return elapsed;
}

export function isUserActive(idleThresholdMs = 5 * 60 * 1000) {
  return getIdleTime() < idleThresholdMs;
}
