import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

function filePath() {
  return path.join(app.getPath("userData"), "usage.json");
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(filePath(), "utf8"));
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
    return { total: value, apps: {}, events: {}, sessions: {} };
  }

  if (!value || typeof value !== "object") {
    return { total: 0, apps: {}, events: {}, sessions: {} };
  }

  return {
    total: Number(value.total) || 0,
    apps: value.apps && typeof value.apps === "object" ? value.apps : {},
    events:
      value.events && typeof value.events === "object" ? value.events : {},
    sessions:
      value.sessions && typeof value.sessions === "object" ? value.sessions : {},
  };
}

function normalizeAppEvent(value) {
  if (!value || typeof value !== "object") {
    return { opens: 0, closes: 0 };
  }

  return {
    opens: Math.max(0, Number(value.opens) || 0),
    closes: Math.max(0, Number(value.closes) || 0),
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

export function recordApplicationEvent(application, type) {
  const appName = String(application || "Unknown").trim() || "Unknown";
  if (type !== "open" && type !== "close") return;

  const data = load();
  const today = dateKey();
  const day = normalizeDay(data[today]);
  const event = normalizeAppEvent(day.events[appName]);

  event[type === "open" ? "opens" : "closes"] += 1;
  day.events[appName] = event;
  data[today] = day;
  save(data);
}

function dayUsage(data, date) {
  const day = normalizeDay(data[date]);

  return {
    date,
    total: Math.floor(day.total),
    apps: Object.entries(day.apps)
      .map(([name, seconds]) => ({
        name,
        seconds: Math.floor(Number(seconds) || 0),
        opens: Math.floor(normalizeAppEvent(day.events[name]).opens),
        closes: Math.floor(normalizeAppEvent(day.events[name]).closes),
        sessions: Array.isArray(day.sessions[name])
          ? day.sessions[name]
              .filter((session) => Number.isFinite(session?.open) && Number.isFinite(session?.close))
              .map((session) => ({ open: session.open, close: session.close }))
          : [],
      }))
      .filter((app) => app.seconds > 0 || app.opens > 0 || app.closes > 0)
      .sort((a, b) => b.seconds - a.seconds),
  };
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
    const event = normalizeAppEvent(day.events[name]);

    result.push({
      date,
      seconds: Math.floor(Number(day.apps[name]) || 0),
      opens: Math.floor(event.opens),
      closes: Math.floor(event.closes),
      sessions: Array.isArray(day.sessions[name])
        ? day.sessions[name]
            .filter((session) => Number.isFinite(session?.open) && Number.isFinite(session?.close))
            .map((session) => ({ open: session.open, close: session.close }))
        : [],
    });
  }

  return {
    application: name,
    days: result,
    total: result.reduce((sum, day) => sum + day.seconds, 0),
    opens: result.reduce((sum, day) => sum + day.opens, 0),
    closes: result.reduce((sum, day) => sum + day.closes, 0),
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
