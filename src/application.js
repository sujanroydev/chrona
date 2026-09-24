const title = document.querySelector("#title");
const total = document.querySelector("#total");
const opens = document.querySelector("#opens");
const closes = document.querySelector("#closes");
const usageChart = document.querySelector("#usageChart");
const eventChart = document.querySelector("#eventChart");
const average = document.querySelector("#average");
const longest = document.querySelector("#longest");
const mostActive = document.querySelector("#mostActive");
const sessions = document.querySelector("#sessions");
const back = document.querySelector("#back");

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

function renderUsage(data) {
  usageChart.innerHTML = "";
  const max = Math.max(...data.days.map((day) => day.seconds), 1);

  for (const day of data.days) {
    const item = document.createElement("div");
    item.className = "bar-item";
    item.title = `${formatDate(day.date)} — ${formatTime(day.seconds)}`;

    const value = document.createElement("div");
    value.className = "bar-value";
    value.textContent = day.seconds ? formatTime(day.seconds) : "";

    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${day.seconds ? Math.max((day.seconds / max) * 100, 3) : 0}%`;

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = formatDate(day.date);

    wrap.appendChild(bar);
    item.append(value, wrap, date);
    usageChart.appendChild(item);
  }
}

function renderEvents(data) {
  eventChart.innerHTML = "";
  const max = Math.max(...data.days.flatMap((day) => [day.opens, day.closes]), 1);

  for (const day of data.days) {
    const group = document.createElement("div");
    group.className = "bar-item";
    group.title = `${formatDate(day.date)} — ${day.opens} opens, ${day.closes} closes`;

    const value = document.createElement("div");
    value.className = "bar-value";
    value.textContent = day.opens || day.closes ? `${day.opens}/${day.closes}` : "";

    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";
    wrap.style.display = "flex";
    wrap.style.alignItems = "flex-end";
    wrap.style.gap = "3px";

    const openBar = document.createElement("div");
    openBar.className = "bar open-bar";
    openBar.style.height = `${day.opens ? Math.max((day.opens / max) * 100, 3) : 0}%`;

    const closeBar = document.createElement("div");
    closeBar.className = "bar close-bar";
    closeBar.style.height = `${day.closes ? Math.max((day.closes / max) * 100, 3) : 0}%`;

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = formatDate(day.date);

    wrap.append(openBar, closeBar);
    group.append(value, wrap, date);
    eventChart.appendChild(group);
  }
}

function renderAnalytics(data) {
  const activeDays = data.days.filter((day) => day.seconds > 0);
  const averageSeconds = activeDays.length ? data.total / activeDays.length : 0;
  const longestDay = data.days.reduce((best, day) => day.seconds > best.seconds ? day : best, { seconds: 0 });
  const mostDay = longestDay.seconds ? formatDate(longestDay.date) : "—";
  const sessionCount = data.opens;

  average.textContent = formatTime(averageSeconds);
  longest.textContent = formatTime(longestDay.seconds);
  mostActive.textContent = mostDay;
  sessions.textContent = (sessionCount / 30).toFixed(1);
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const application = params.get("app");

  if (!application) {
    title.textContent = "Application";
    usageChart.innerHTML = '<div class="empty">No application selected.</div>';
    return;
  }

  title.textContent = application;
  const data = await window.chrona.getApplicationUsage(application, 30);

  total.textContent = formatTime(data.total);
  opens.textContent = data.opens;
  closes.textContent = data.closes;

  renderUsage(data);
  renderEvents(data);
  renderAnalytics(data);
}

back.addEventListener("click", () => {
  window.location.href = "usage.html";
});

init();
