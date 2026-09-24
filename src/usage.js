const chart = document.querySelector("#chart");
const chartTitle = document.querySelector("#chartTitle");
const detailDate = document.querySelector("#detailDate");
const detailTotal = document.querySelector("#detailTotal");
const apps = document.querySelector("#apps");
const eventChart = document.querySelector("#eventChart");
const activeApps = document.querySelector("#activeApps");
const dayOpens = document.querySelector("#dayOpens");
const dayCloses = document.querySelector("#dayCloses");
const topApp = document.querySelector("#topApp");
const avgApp = document.querySelector("#avgApp");
const topShare = document.querySelector("#topShare");
const rangeTotal = document.querySelector("#rangeTotal");
const rangeAverage = document.querySelector("#rangeAverage");
const rangeActiveDays = document.querySelector("#rangeActiveDays");
const rangePeak = document.querySelector("#rangePeak");
const rangeApps = document.querySelector("#rangeApps");
const rangeSessions = document.querySelector("#rangeSessions");
const back = document.querySelector("#back");
const detailBack = document.querySelector("#detailBack");

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
  return parseDate(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(date) {
  return parseDate(date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

  if (!history.length) {
    chart.innerHTML = '<div class="empty">No usage recorded yet.</div>';
  }
}

function renderApps(day) {
  detailDate.textContent = formatFullDate(day.date);
  detailTotal.textContent = formatTime(day.total);
  detailBack.hidden = true;
  apps.innerHTML = "";

  if (!day.apps.length) {
    apps.innerHTML =
      '<div class="empty">No application usage recorded for this day.</div>';
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
    row.addEventListener("click", () => selectApplication(app.name));
    apps.appendChild(row);
  }
}

function renderEvents(day) {
  eventChart.innerHTML = "";
  const max = Math.max(
    ...day.apps.flatMap((app) => [app.opens, app.closes]),
    1,
  );

  const rows = day.apps.filter((app) => app.opens || app.closes);

  if (!rows.length) {
    eventChart.innerHTML =
      '<div class="empty">No open/close activity recorded for this day.</div>';
    return;
  }

  for (const app of rows) {
    const item = document.createElement("div");
    item.className = "event-item";
    item.title = `${app.name} — ${app.opens} opens, ${app.closes} closes`;

    const value = document.createElement("div");
    value.className = "event-value";
    value.textContent = `${app.opens}/${app.closes}`;

    const wrap = document.createElement("div");
    wrap.className = "event-wrap";

    const openBar = document.createElement("div");
    openBar.className = "event-bar open-bar";
    openBar.style.height = `${Math.max((app.opens / max) * 100, app.opens ? 3 : 0)}%`;

    const closeBar = document.createElement("div");
    closeBar.className = "event-bar close-bar";
    closeBar.style.height = `${Math.max((app.closes / max) * 100, app.closes ? 3 : 0)}%`;

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = app.name.length > 9 ? `${app.name.slice(0, 8)}…` : app.name;

    wrap.append(openBar, closeBar);
    item.append(value, wrap, date);
    eventChart.appendChild(item);
  }
}

function renderDayAnalytics(day) {
  const appsWithUsage = day.apps.filter((app) => app.seconds > 0);
  const opens = day.apps.reduce((sum, app) => sum + app.opens, 0);
  const closes = day.apps.reduce((sum, app) => sum + app.closes, 0);
  const top = appsWithUsage[0];
  const average = appsWithUsage.length ? day.total / appsWithUsage.length : 0;
  const share = day.total && top ? (top.seconds / day.total) * 100 : 0;

  activeApps.textContent = appsWithUsage.length;
  dayOpens.textContent = opens;
  dayCloses.textContent = closes;
  topApp.textContent = top ? top.name : "—";
  topApp.title = top ? top.name : "";
  avgApp.textContent = formatTime(average);
  topShare.textContent = `${Math.round(share)}%`;
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
      sessions += app.opens;
    }
  }

  rangeTotal.textContent = formatTime(total);
  rangeAverage.textContent = formatTime(
    activeDays.length ? total / activeDays.length : 0,
  );
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
  renderEvents(day);
  renderDayAnalytics(day);
  renderRangeAnalytics(currentHistory);
}

async function selectApplication(application) {
  window.location.href = `application.html?app=${encodeURIComponent(application)}`;
}

async function init() {
  currentHistory = await window.chrona.getUsageHistory(30);
  selectedDate = currentHistory[currentHistory.length - 1]?.date;

  renderChart(currentHistory, selectedDate);
  renderRangeAnalytics(currentHistory);

  if (selectedDate) {
    const day = await window.chrona.getDayUsage(selectedDate);
    renderApps(day);
    renderEvents(day);
    renderDayAnalytics(day);
  }
}

back.addEventListener("click", () => {
  window.location.href = "index.html";
});

detailBack.addEventListener("click", async () => {
  if (!selectedDate) return;
  const day = await window.chrona.getDayUsage(selectedDate);
  renderApps(day);
  renderEvents(day);
  renderDayAnalytics(day);
});

init();
