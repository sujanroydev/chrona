const chart = document.querySelector("#chart");
const detailDate = document.querySelector("#detailDate");
const detailTotal = document.querySelector("#detailTotal");
const apps = document.querySelector("#apps");
const activeTrack = document.querySelector("#activeTrack");
const activeSessionList = document.querySelector("#activeSessionList");
const activeApps = document.querySelector("#activeApps");
const activeTime = document.querySelector("#activeTime");
const topApp = document.querySelector("#topApp");
const avgApp = document.querySelector("#avgApp");
const topShare = document.querySelector("#topShare");
const daySessions = document.querySelector("#daySessions");
const rangeTotal = document.querySelector("#rangeTotal");
const rangeAverage = document.querySelector("#rangeAverage");
const rangeActiveDays = document.querySelector("#rangeActiveDays");
const rangePeak = document.querySelector("#rangePeak");
const rangeApps = document.querySelector("#rangeApps");
const rangeSessions = document.querySelector("#rangeSessions");
const back = document.querySelector("#back");

let currentHistory = [];
let selectedDate = null;

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function parseDate(date) {
  return new Date(`${date}T12:00:00`);
}

function formatDate(date) {
  return parseDate(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFullDate(date) {
  return parseDate(date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderChart(history, selected) {
  chart.innerHTML = "";
  const max = Math.max(...history.map((day) => day.total), 1);

  for (const day of history) {
    const item = document.createElement("div");
    item.className = `bar-item${day.date === selected ? " selected" : ""}`;
    item.title = `${formatFullDate(day.date)} — ${formatTime(day.total)}`;

    const value = document.createElement("div");
    value.className = "bar-value";
    value.textContent = day.total ? formatTime(day.total) : "";

    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${day.total ? Math.max((day.total / max) * 100, 3) : 0}%`;

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = formatDate(day.date);

    wrap.appendChild(bar);
    item.append(value, wrap, date);
    item.addEventListener("click", () => selectDay(day.date));
    chart.appendChild(item);
  }

  if (!history.length) chart.innerHTML = '<div class="empty">No usage recorded yet.</div>';
}

function renderApps(day) {
  detailDate.textContent = formatFullDate(day.date);
  detailTotal.textContent = formatTime(day.total);
  apps.innerHTML = "";

  if (!day.apps.length) {
    apps.innerHTML = '<div class="empty">No application usage recorded for this day.</div>';
    return;
  }

  const max = Math.max(...day.apps.map((app) => app.seconds), 1);

  for (const app of day.apps) {
    const row = document.createElement("button");
    row.className = "app-row";
    row.type = "button";
    row.title = `View ${app.name} usage for the last 30 days`;

    const name = document.createElement("div");
    name.className = "app-name";
    name.textContent = app.name;
    name.title = app.name;

    const track = document.createElement("div");
    track.className = "track";

    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${(app.seconds / max) * 100}%`;
    track.appendChild(fill);

    const time = document.createElement("div");
    time.className = "app-time";
    time.textContent = formatTime(app.seconds);

    row.append(name, track, time);
    row.addEventListener("click", () => {
      window.location.href = `application.html?app=${encodeURIComponent(app.name)}`;
    });
    apps.appendChild(row);
  }
}

function renderOverallActivity(day) {
  activeTrack.innerHTML = "";
  activeSessionList.innerHTML = "";

  const sessions = Array.isArray(day.activeSessions) ? day.activeSessions : [];
  const dayStart = new Date(`${day.date}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const dayDuration = 24 * 60 * 60 * 1000;

  for (const session of sessions) {
    const open = Math.max(Number(session.open), dayStart);
    const close = Math.min(Number(session.close), dayEnd);
    if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open) continue;

    const segment = document.createElement("div");
    segment.className = "timeline-segment";
    segment.setAttribute("aria-label", `${formatClock(open)} to ${formatClock(close)}, ${formatTime((close - open) / 1000)}`);
    segment.style.left = `${((open - dayStart) / dayDuration) * 100}%`;
    segment.style.width = `${((close - open) / dayDuration) * 100}%`;
    segment.title = `${formatClock(open)} – ${formatClock(close)} · ${formatTime((close - open) / 1000)}`;
    activeTrack.appendChild(segment);

    const row = document.createElement("div");
    row.className = "session";
    const time = document.createElement("span");
    time.className = "session-time";
    time.textContent = `${formatClock(open)} – ${formatClock(close)}`;
    const duration = document.createElement("span");
    duration.className = "session-duration";
    duration.textContent = formatTime((close - open) / 1000);
    row.append(time, duration);
    activeSessionList.appendChild(row);
  }

  if (!sessions.length) {
    activeSessionList.innerHTML = '<div class="empty">No recorded active periods for this day.</div>';
  }
}

function renderDayAnalytics(day) {
  const appsWithUsage = day.apps.filter((app) => app.seconds > 0);
  const top = appsWithUsage[0];
  const average = appsWithUsage.length ? day.total / appsWithUsage.length : 0;
  const share = day.total && top ? (top.seconds / day.total) * 100 : 0;

  activeApps.textContent = appsWithUsage.length;
  activeTime.textContent = formatTime(day.total);
  topApp.textContent = top ? top.name : "—";
  topApp.title = top ? top.name : "";
  avgApp.textContent = formatTime(average);
  topShare.textContent = `${Math.round(share)}%`;
  daySessions.textContent = day.sessions.length;
}

function renderRangeAnalytics(history) {
  const total = history.reduce((sum, day) => sum + day.total, 0);
  const activeDays = history.filter((day) => day.total > 0);
  const peak = activeDays.reduce(
    (best, day) => (day.total > best.total ? day : best),
    { total: 0, date: "" },
  );

  const applicationNames = new Set();
  let sessions = 0;

  for (const day of history) {
    for (const app of day.apps) {
      if (app.seconds > 0) applicationNames.add(app.name);
      sessions += app.sessions.length;
    }
  }

  rangeTotal.textContent = formatTime(total);
  rangeAverage.textContent = formatTime(activeDays.length ? total / activeDays.length : 0);
  rangeActiveDays.textContent = activeDays.length;
  rangePeak.textContent = peak.date ? formatDate(peak.date) : "—";
  rangeApps.textContent = applicationNames.size;
  rangeSessions.textContent = sessions;
}

async function selectDay(date) {
  selectedDate = date;
  const day = await window.chrona.getDayUsage(date);

  renderChart(currentHistory, date);
  renderApps(day);
  renderOverallActivity(day);
  renderDayAnalytics(day);
  renderRangeAnalytics(currentHistory);
}

async function init() {
  currentHistory = await window.chrona.getUsageHistory(30);
  selectedDate = currentHistory[currentHistory.length - 1]?.date;

  renderChart(currentHistory, selectedDate);
  renderRangeAnalytics(currentHistory);

  if (selectedDate) await selectDay(selectedDate);
}

back.addEventListener("click", () => {
  window.location.href = "index.html";
});

init();
