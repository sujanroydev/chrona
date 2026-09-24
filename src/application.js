const title = document.querySelector("#title");
const total = document.querySelector("#total");
const sessionCount = document.querySelector("#sessionCount");
const activeDays = document.querySelector("#activeDays");
const usageChart = document.querySelector("#usageChart");
const average = document.querySelector("#average");
const longest = document.querySelector("#longest");
const mostActive = document.querySelector("#mostActive");
const sessionsPerDay = document.querySelector("#sessionsPerDay");
const back = document.querySelector("#back");
const timelineDate = document.querySelector("#timelineDate");
const timelineTrack = document.querySelector("#timelineTrack");
const sessionList = document.querySelector("#sessionList");
let applicationData = null;

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

function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(date) {
  return parseDate(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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

function renderTimeline(day) {
  timelineTrack.innerHTML = "";
  sessionList.innerHTML = "";

  const sessionsForDay = Array.isArray(day.sessions) ? day.sessions : [];
  const dayStart = new Date(`${day.date}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const dayDuration = 24 * 60 * 60 * 1000;

  for (const session of sessionsForDay) {
    const open = Math.max(Number(session.open), dayStart);
    const close = Math.min(Number(session.close), dayEnd);
    if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open) continue;

    const segment = document.createElement("div");
    segment.className = "timeline-segment";
    segment.style.left = `${((open - dayStart) / dayDuration) * 100}%`;
    segment.style.width = `${((close - open) / dayDuration) * 100}%`;
    segment.title = `${formatClock(open)} – ${formatClock(close)}`;
    timelineTrack.appendChild(segment);

    const row = document.createElement("div");
    row.className = "session";
    const time = document.createElement("span");
    time.className = "session-time";
    time.textContent = `${formatClock(open)} – ${formatClock(close)}`;
    const duration = document.createElement("span");
    duration.className = "session-duration";
    duration.textContent = formatTime((close - open) / 1000);
    row.append(time, duration);
    sessionList.appendChild(row);
  }

  if (!sessionsForDay.length) {
    sessionList.innerHTML = '<div class="empty">No recorded usage intervals for this day.</div>';
  }
}

function populateTimelineDates(data) {
  timelineDate.innerHTML = "";
  for (const day of data.days) {
    const option = document.createElement("option");
    option.value = day.date;
    option.textContent = formatDateLong(day.date);
    timelineDate.appendChild(option);
  }
}

function renderAnalytics(data) {
  const activeDays = data.days.filter((day) => day.seconds > 0);
  const averageSeconds = activeDays.length ? data.total / activeDays.length : 0;
  const longestDay = data.days.reduce((best, day) => day.seconds > best.seconds ? day : best, { seconds: 0 });

  total.textContent = formatTime(data.total);
  sessionCount.textContent = data.sessions;
  activeDays.textContent = activeDays.length;
  average.textContent = formatTime(averageSeconds);
  longest.textContent = formatTime(longestDay.seconds);
  mostActive.textContent = longestDay.seconds ? formatDate(longestDay.date) : "—";
  sessionsPerDay.textContent = activeDays.length ? (data.sessions / activeDays.length).toFixed(1) : "0";
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
  applicationData = data;
  populateTimelineDates(data);
  timelineDate.value = data.days[data.days.length - 1]?.date || "";
  renderUsage(data);
  renderAnalytics(data);

  const selectedDay = data.days[data.days.length - 1];
  if (selectedDay) renderTimeline(selectedDay);
}

back.addEventListener("click", () => {
  window.location.href = "usage.html";
});

timelineDate.addEventListener("change", () => {
  const day = applicationData?.days.find((item) => item.date === timelineDate.value);
  if (day) renderTimeline(day);
});

init();
