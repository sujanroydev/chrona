const chart = document.querySelector("#chart");
const detailDate = document.querySelector("#detailDate");
const detailTotal = document.querySelector("#detailTotal");
const apps = document.querySelector("#apps");
const back = document.querySelector("#back");

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

function renderChart(history, selectedDate) {
  chart.innerHTML = "";

  const max = Math.max(...history.map((day) => day.total), 1);

  for (const day of history) {
    const item = document.createElement("div");
    item.className = `bar-item${day.date === selectedDate ? " today" : ""}`;
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
    item.addEventListener("click", () => selectDay(day.date, history));
    chart.appendChild(item);
  }

  if (!history.length) {
    chart.innerHTML = '<div class="empty">No usage recorded yet.</div>';
  }
}

function renderApps(day) {
  detailDate.textContent = formatFullDate(day.date);
  detailTotal.textContent = formatTime(day.total);
  apps.innerHTML = "";

  if (!day.apps.length) {
    apps.innerHTML =
      '<div class="empty">No application usage recorded for this day.</div>';
    return;
  }

  const max = Math.max(...day.apps.map((app) => app.seconds), 1);

  for (const app of day.apps) {
    const row = document.createElement("div");
    row.className = "app-row";

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
    apps.appendChild(row);
  }
}

async function selectDay(date, history) {
  const day = await window.chrona.getDayUsage(date);
  renderChart(history, date);
  renderApps(day);
}

async function init() {
  const history = await window.chrona.getUsageHistory(30);
  const today = history[history.length - 1]?.date;
  renderChart(history, today);

  if (today) {
    const day = await window.chrona.getDayUsage(today);
    renderApps(day);
  }
}

back.addEventListener("click", () => {
  window.location.href = "index.html";
});

init();
