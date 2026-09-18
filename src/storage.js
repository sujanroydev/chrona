import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDir, "usage.json");

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({}, null, 2), "utf8");
  }
}

export function loadData() {
  ensureStorage();

  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return {};
  }
}

export function saveData(data) {
  ensureStorage();

  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

export function todayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addUsage(seconds) {
  const data = loadData();
  const key = todayKey();

  data[key] = (data[key] || 0) + seconds;

  saveData(data);

  return data[key];
}
