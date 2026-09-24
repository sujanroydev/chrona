import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

function filePath() {
  return path.join(app.getPath("userData"), "usage.json");
}

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(filePath(), "utf8"));
    let changed = false;

    // Sessions are the source of truth for application activity. Remove the
    // old event counters from existing files during migration.
    for (const value of Object.values(data)) {
      if (value && typeof value === "object" && !Array.isArray(value) && "events" in value) {
        delete value.events;
        changed = true;
      }
    }

    if (changed) save(data);
    return data;
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(filePath()), { recursive: true });
  fs.writeFileSync(filePath(), JSON.stringify(data, null, 2), "utf8");
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
      value.sessions && typeof value.sessions === "object" ? value.sessions : {},
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

function dayUsage(data, date) {
  const day = normalizeDay(data[date]);
  const apps = Object.entries(day.apps)
    .map(([name, seconds]) => {
      const sessions = cleanSessions(day.sessions[name]);
      return {
        name,
        seconds: Math.floor(Number(seconds) || 0),
        sessions,
      };
    })
    .filter((app) => app.seconds > 0 || app.sessions.length > 0)
    .sort((a, b) => b.seconds - a.seconds);

  const sessions = apps
    .flatMap((app) => app.sessions.map((session) => ({ ...session, application: app.name })))
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

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;

  const data = load();
  let cursor = new Date(start);

  while (cursor.getTime() < end) {
    const date = dateKey(cursor);
    const next = new Date(cursor);
    next.setHours(24, 0, 0, 0);
    const segmentEnd = Math.min(end, next.getTime());
    const day = normalizeDay(data[date]);

    if (!Array.isArray(day.sessions[appName])) day.sessions[appName] = [];
    day.sessions[appName].push({ open: cursor.getTime(), close: segmentEnd });
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
      sessions: cleanSessions(day.sessions[name]),
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
