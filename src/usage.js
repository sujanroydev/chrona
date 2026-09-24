const chart = document.querySelector("#chart");
const chartTitle = document.querySelector("#chartTitle");
const detailDate = document.querySelector("#detailDate");
const detailTotal = document.querySelector("#detailTotal");
const apps = document.querySelector("#apps");
const back = document.querySelector("#back");
const detailBack = document.querySelector("#detailBack");

let currentHistory = [];
let selectedDate = null;
let selectedApplication = null;

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
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
    bar.style.height = `${Math.max((day.total / max) * 100, day.total ? 3 : 0)}%`;

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
  selectedApplication = null;
  detailDate.textContent = formatFullDate(day.date);
  detailTotal.textContent = formatTime(day.total);
  chartTitle.textContent = "Daily usage";
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

function renderApplicationHistory(data) {
  selectedApplication = data.application;
  detailBack.hidden = false;
  chartTitle.textContent = `${data.application} — last 30 days`;
  detailDate.textContent = "Application usage";
  detailTotal.textContent = formatTime(data.total);
  apps.innerHTML = "";

  const max = Math.max(...data.days.map((day) => day.seconds), 1);
  const wrapper = document.createElement("div");
  wrapper.className = "app-history-chart";

  for (const day of data.days) {
    const item = document.createElement("div");
    item.className = "bar-item";
    item.title = `${formatFullDate(day.date)} — ${formatTime(day.seconds)}`;

    const value = document.createElement("div");
    value.className = "bar-value";
    value.textContent = day.seconds ? formatTime(day.seconds) : "";

    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";

    const bar = document.createElement("div");
    bar.className = "bar app-bar";
    bar.style.height = `${Math.max((day.seconds / max) * 100, day.seconds ? 3 : 0)}%`;

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = formatDate(day.date);

    wrap.appendChild(bar);
    item.append(value, wrap, date);
    wrapper.appendChild(item);
  }

  apps.appendChild(wrapper);
}

async function selectDay(date) {
  selectedDate = date;
  const day = await window.chrona.getDayUsage(date);
  renderChart(currentHistory, date);
  renderApps(day);
}

async function selectApplication(application) {
  const data = await window.chrona.getApplicationUsage(application, 30);
  renderApplicationHistory(data);
}

async function init() {
  currentHistory = await window.chrona.getUsageHistory(30);
  selectedDate = currentHistory[currentHistory.length - 1]?.date;
  renderChart(currentHistory, selectedDate);

  if (selectedDate) {
    const day = await window.chrona.getDayUsage(selectedDate);
    renderApps(day);
  }
}

back.addEventListener("click", () => {
  window.location.href = "index.html";
});

detailBack.addEventListener("click", async () => {
  if (!selectedDate) return;
  const day = await window.chrona.getDayUsage(selectedDate);
  renderApps(day);
});

init();
