import koffi from "koffi";

const user32 = koffi.load("user32.dll");
const kernel32 = koffi.load("kernel32.dll");

const LASTINPUTINFO = koffi.struct("LASTINPUTINFO", {
  cbSize: "uint32",
  dwTime: "uint32"
});

const GetLastInputInfo = user32.func(
  "bool __stdcall GetLastInputInfo(_Inout_ LASTINPUTINFO *plii)"
);

const GetTickCount = kernel32.func(
  "uint32 __stdcall GetTickCount()"
);

export function getIdleTime() {
  const info = {
    cbSize: koffi.sizeof(LASTINPUTINFO),
    dwTime: 0
  };

  if (!GetLastInputInfo(info)) {
    throw new Error("GetLastInputInfo failed");
  }

  const current = GetTickCount();
  return ((current - info.dwTime) >>> 0);
}

export function isUserActive(thresholdMs) {
  try {
    return getIdleTime() < thresholdMs;
  } catch {
    return false;
  }
}
