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
  // Backwards compatibility with the original format:
  // { "2026-09-24": 12345 }
  if (typeof value === "number") {
    return { total: value, apps: {} };
  }

  if (!value || typeof value !== "object") {
    return { total: 0, apps: {} };
  }

  return {
    total: Number(value.total) || 0,
    apps: value.apps && typeof value.apps === "object" ? value.apps : {},
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

function dayUsage(data, date) {
  const day = normalizeDay(data[date]);

  return {
    date,
    total: Math.floor(day.total),
    apps: Object.entries(day.apps)
      .map(([name, seconds]) => ({
        name,
        seconds: Math.floor(Number(seconds) || 0),
      }))
      .filter((app) => app.seconds > 0)
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
