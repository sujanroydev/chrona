import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

function filePath() {
  return path.join(app.getPath("userData"), "usage.json");
}

function backupPath() {
  return path.join(app.getPath("userData"), "usage.json.bak");
}

function tempPath() {
  return path.join(
    app.getPath("userData"),
    `usage.json.tmp-${process.pid}-${Date.now()}`,
  );
}

function isValidData(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw);

    if (!isValidData(data)) {
      throw new Error("Usage data must be a JSON object");
    }

    return data;
  } catch {
    return null;
  }
}

function quarantine(file, suffix) {
  if (!fs.existsSync(file)) return;

  try {
    const target = `${file}.${suffix}-${Date.now()}`;
    fs.renameSync(file, target);
  } catch {
    // Keep the original file if Windows does not allow the rename.
  }
}

function writeFileSafely(file, data) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });

  const temporary = tempPath();
  const serialized = JSON.stringify(data, null, 2);

  let fd;

  try {
    fd = fs.openSync(temporary, "w");
    fs.writeFileSync(fd, serialized, "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;

    /*
     * Windows does not reliably allow rename-overwrite. Copying the fully
     * written temporary file keeps the normal write path simple. A previous
     * valid version is kept in usage.json.bak so a failed/corrupt write can
     * always be recovered on the next read.
     */
    fs.copyFileSync(temporary, file);
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {}
    }

    try {
      fs.unlinkSync(temporary);
    } catch {}
  }
}

function save(data, { createBackup = true } = {}) {
  const file = filePath();
  const backup = backupPath();

  fs.mkdirSync(path.dirname(file), { recursive: true });

  if (createBackup && fs.existsSync(file)) {
    const current = readJson(file);

    // Never replace a known-good backup with a corrupt/partial file.
    if (current !== null) {
      try {
        fs.copyFileSync(file, backup);
      } catch {
        // The main file is still usable; continue with the save.
      }
    }
  }

  writeFileSafely(file, data);
}

function load() {
  const file = filePath();
  const backup = backupPath();

  const data = readJson(file);

  if (data !== null) {
    let changed = false;

    // Sessions are the source of truth for application activity. Remove the
    // old event counters from existing files during migration.
    for (const value of Object.values(data)) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        "events" in value
      ) {
        delete value.events;
        changed = true;
      }
    }

    if (changed) save(data);
    return data;
  }

  /*
   * IMPORTANT:
   * Never turn a read/parse failure into an empty database. The old code did
   * that, and the next tracking tick could save `{}` and erase all history.
   *
   * Try the last known-good backup first.
   */
  const recovered = readJson(backup);

  if (recovered !== null) {
    quarantine(file, "corrupt");

    // Restore the recovered data without backing up the corrupt main file.
    save(recovered, { createBackup: false });
    return recovered;
  }

  /*
   * Both copies are unavailable/corrupt. Preserve whatever files remain so
   * the data is not silently destroyed, then start a fresh store.
   */
  if (fs.existsSync(file)) quarantine(file, "corrupt");
  if (fs.existsSync(backup)) quarantine(backup, "backup-corrupt");

  return {};
}

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousDate(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function normalizeDay(value) {
  if (typeof value === "number") {
    return { total: value, apps: {}, sessions: {} };
  }

  if (!value || typeof value !== "object") {
    return { total: 0, apps: {}, sessions: {} };
  }

  return {
    total: Number(value.total) || 0,
    apps: value.apps && typeof value.apps === "object" ? value.apps : {},
    sessions:
      value.sessions && typeof value.sessions === "object"
        ? value.sessions
        : {},
  };
}

function cleanSessions(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (session) =>
        Number.isFinite(Number(session?.open)) &&
        Number.isFinite(Number(session?.close)) &&
        Number(session.close) > Number(session.open),
    )
    .map((session) => ({
      open: Number(session.open),
      close: Number(session.close),
    }))
    .sort((a, b) => a.open - b.open);
}

function normalizeApplicationName(value) {
  return String(value || "").trim().toLowerCase();
}

function getApplicationSessions(day, application) {
  const target = normalizeApplicationName(application);
  if (!target) return [];

  // Current format: sessions are grouped by application name.
  if (
    day.sessions &&
    typeof day.sessions === "object" &&
    !Array.isArray(day.sessions)
  ) {
    for (const [name, value] of Object.entries(day.sessions)) {
      if (normalizeApplicationName(name) === target) {
        return cleanSessions(value);
      }
    }
  }

  // Also accept the earlier flat session format in case an existing
  // usage.json was written before sessions were grouped by application.
  if (Array.isArray(day.sessions)) {
    return cleanSessions(
      day.sessions.filter(
        (session) =>
          normalizeApplicationName(session?.application) === target,
      ),
    );
  }

  return [];
}

function dayUsage(data, date) {
  const day = normalizeDay(data[date]);
  const apps = Object.entries(day.apps)
    .map(([name, seconds]) => {
      const sessions = getApplicationSessions(day, name);
      return {
        name,
        seconds: Math.floor(Number(seconds) || 0),
        sessions,
      };
    })
    .filter((app) => app.seconds > 0 || app.sessions.length > 0)
    .sort((a, b) => b.seconds - a.seconds);

  const sessions = apps
    .flatMap((app) =>
      app.sessions.map((session) => ({ ...session, application: app.name })),
    )
    .sort((a, b) => a.open - b.open);

  // Merge app sessions into one overall activity timeline. This represents
  // computer-active time rather than individual application switches.
  const activeSessions = [];
  for (const session of sessions) {
    const previous = activeSessions[activeSessions.length - 1];
    if (previous && session.open <= previous.close) {
      previous.close = Math.max(previous.close, session.close);
    } else {
      activeSessions.push({ open: session.open, close: session.close });
    }
  }

  return {
    date,
    total: Math.floor(day.total),
    apps,
    sessions,
    activeSessions,
  };
}

export function addUsage(seconds, application = "Unknown") {
  const data = load();
  const today = dateKey();
  const day = normalizeDay(data[today]);
  const appName = String(application || "Unknown").trim() || "Unknown";

  day.total += seconds;
  day.apps[appName] = (Number(day.apps[appName]) || 0) + seconds;

  data[today] = day;
  save(data);
}

export function recordApplicationSession(application, openAt, closeAt) {
  const start = Number(openAt);
  const end = Number(closeAt);
  const appName = String(application || "Unknown").trim() || "Unknown";

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return;
  }

  const data = load();
  let cursor = new Date(start);

  while (cursor.getTime() < end) {
    const date = dateKey(cursor);
    const next = new Date(cursor);
    next.setHours(24, 0, 0, 0);
    const segmentEnd = Math.min(end, next.getTime());
    const day = normalizeDay(data[date]);

    if (!Array.isArray(day.sessions[appName])) {
      day.sessions[appName] = [];
    }

    day.sessions[appName].push({
      open: cursor.getTime(),
      close: segmentEnd,
    });

    data[date] = day;
    cursor = new Date(segmentEnd);
  }

  save(data);
}

export function getUsage() {
  const data = load();
  const today = dateKey();
  const yesterday = dateKey(previousDate(1));

  let week = 0;
  for (let i = 0; i < 7; i++) {
    week += normalizeDay(data[dateKey(previousDate(i))]).total;
  }

  return {
    today: Math.floor(normalizeDay(data[today]).total),
    yesterday: Math.floor(normalizeDay(data[yesterday]).total),
    week: Math.floor(week),
  };
}

export function getDayUsage(date) {
  const data = load();
  return dayUsage(data, date);
}

export function getApplicationUsage(application, days = 30) {
  const data = load();
  const name = String(application || "").trim();
  const count = Math.max(1, Math.min(Number(days) || 30, 365));
  const result = [];

  for (let i = count - 1; i >= 0; i--) {
    const date = dateKey(previousDate(i));
    const day = normalizeDay(data[date]);

    result.push({
      date,
      seconds: Math.floor(Number(day.apps[name]) || 0),
      sessions: getApplicationSessions(day, name),
    });
  }

  return {
    application: name,
    days: result,
    total: result.reduce((sum, day) => sum + day.seconds, 0),
    sessions: result.reduce((sum, day) => sum + day.sessions.length, 0),
  };
}

export function getRecentUsage(days = 30) {
  const data = load();
  const count = Math.max(1, Math.min(Number(days) || 30, 365));
  const result = [];

  for (let i = count - 1; i >= 0; i--) {
    const date = dateKey(previousDate(i));
    result.push(dayUsage(data, date));
  }

  return result;
}
