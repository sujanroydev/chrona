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

function key(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function addUsage(seconds) {
  const data = load();
  const today = key();
  data[today] = (data[today] || 0) + seconds;
  save(data);
}

export function getUsage() {
  const data = load();
  const today = key();
  const yesterday = key(previousDate(1));

  let week = 0;
  for (let i = 0; i < 7; i++) {
    week += data[key(previousDate(i))] || 0;
  }

  return {
    today: Math.floor(data[today] || 0),
    yesterday: Math.floor(data[yesterday] || 0),
    week: Math.floor(week)
  };
}
