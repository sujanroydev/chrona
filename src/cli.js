import { loadData, todayKey } from "./storage.js";

function formatTime(seconds) {
  seconds = Math.floor(seconds);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLastDays(count) {
  const dates = [];

  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now);

    date.setDate(now.getDate() - i);

    dates.push(getDateKey(date));
  }

  return dates;
}

function showToday() {
  const data = loadData();

  console.log();
  console.log("Laptop Screen Time");
  console.log("------------------");
  console.log(`Today: ${formatTime(data[todayKey()] || 0)}`);
  console.log();
}

function showWeek() {
  const data = loadData();
  const dates = getLastDays(7);

  const total = dates.reduce((sum, date) => sum + (data[date] || 0), 0);

  console.log();
  console.log("Last 7 Days");
  console.log("-----------");

  for (const date of dates) {
    console.log(`${date}: ${formatTime(data[date] || 0)}`);
  }

  console.log("-----------");
  console.log(`Total: ${formatTime(total)}`);
  console.log();
}

function showMonth() {
  const data = loadData();

  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth();

  let total = 0;

  for (const [date, seconds] of Object.entries(data)) {
    const current = new Date(`${date}T00:00:00`);

    if (current.getFullYear() === year && current.getMonth() === month) {
      total += seconds;
    }
  }

  console.log();
  console.log("This Month");
  console.log("-----------");
  console.log(`Total: ${formatTime(total)}`);
  console.log();
}

const command = process.argv[2] || "today";

switch (command) {
  case "today":
    showToday();
    break;

  case "week":
    showWeek();
    break;

  case "month":
    showMonth();
    break;

  default:
    console.log(`
Laptop Time Tracker

Commands:

  npm run today
  npm run week
  npm run month
`);
}
