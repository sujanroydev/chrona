const title = document.querySelector("#title");
const total = document.querySelector("#total");
const sessionCount = document.querySelector("#sessionCount");
const activeDaysEl = document.querySelector("#activeDays");
const usageChart = document.querySelector("#usageChart");
const average = document.querySelector("#average");
const longest = document.querySelector("#longest");
const mostActive = document.querySelector("#mostActive");
const sessionsPerDay = document.querySelector("#sessions");
const back = document.querySelector("#back");
const timelineTrack = document.querySelector("#timelineTrack");
const sessionList = document.querySelector("#sessionList");

let applicationData = null;
let refreshTimer = null;

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (minutes === 0 && hours === 0) return `${value}s`;
  if (hours === 0) return `${minutes}m ${value % minutes}s`;
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

function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLong(date) {
  return parseDate(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function renderUsage(data, selectedDate = null) {
  usageChart.innerHTML = "";
  const max = Math.max(...data.days.map((day) => day.seconds), 1);

  for (const day of data.days) {
    const item = document.createElement("div");
    item.className = `bar-item${day.date === selectedDate ? " selected" : ""}`;
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
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute(
      "aria-pressed",
      day.date === selectedDate ? "true" : "false",
    );
    item.addEventListener("click", () => {
      if (applicationData) selectDay(day.date);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (applicationData) selectDay(day.date);
      }
    });
    usageChart.appendChild(item);
  }

  // Scroll to the latest day
  requestAnimationFrame(() => {
    usageChart.scrollLeft = usageChart.scrollWidth;
  });
}

function renderTimeline(day) {
  timelineTrack.innerHTML = "";
  sessionList.innerHTML = "";

  const sessions = Array.isArray(day?.sessions) ? day.sessions : [];
  const dayStart = new Date(`${day.date}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const dayDuration = 24 * 60 * 60 * 1000;
  const MIN_GAP = 30 * 1000;

  const sessionsForDay = sessions
    .map((session) => ({
      open: Math.max(Number(session.open), dayStart),
      close: Math.min(Number(session.close), dayEnd),
    }))
    .filter(
      (session) =>
        Number.isFinite(session.open) &&
        Number.isFinite(session.close) &&
        session.close > session.open,
    )
    .sort((a, b) => a.open - b.open);

  const items = [];
  let previousClose = dayStart;

  for (const session of sessionsForDay) {
    const gap = session.open - previousClose;

    if (gap <= MIN_GAP) {
      const lastIndex = items.length - 1;
      items[lastIndex] = {
        ...items[lastIndex],
        close: session.open,
      };
    } else {
      items.push({
        type: "active",
        open: session.open,
        close: session.close,
      });
    }

    previousClose = Math.max(previousClose, session.close);
  }

  for (const item of items) {
    const open = item.open;
    const close = item.close;

    // Timeline
    const segment = document.createElement("div");
    segment.className = "timeline-segment";
    segment.setAttribute(
      "aria-label",
      `${formatClock(open)} to ${formatClock(close)}, ${formatTime((close - open) / 1000)}`,
    );
    segment.style.left = `${Math.max(0, Math.min(100, ((open - dayStart) / dayDuration) * 100))}%`;
    segment.style.width = `${Math.max(0, Math.min(100, ((close - open) / dayDuration) * 100))}%`;
    segment.title = `${formatClock(open)} – ${formatClock(close)} · ${formatTime((close - open) / 1000)}`;
    timelineTrack.appendChild(segment);

    // List
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

  if (!timelineTrack.children.length) {
    sessionList.innerHTML =
      '<div class="empty">No recorded usage intervals for this day.</div>';
  }
}

function renderAnalytics(data, selectedDay) {
  const day = selectedDay || { seconds: 0, sessions: [] };
  const sessions = Array.isArray(day.sessions) ? day.sessions : [];
  const totalSeconds = Math.max(0, Number(day.seconds) || 0);
  const averageSession = sessions.length ? totalSeconds / sessions.length : 0;
  const longestSession = sessions.reduce((best, session) => {
    const duration = Math.max(
      0,
      (Number(session.close) - Number(session.open)) / 1000,
    );
    return duration > best ? duration : best;
  }, 0);
  const firstSession = sessions[0];
  const lastSession = sessions[sessions.length - 1];

  total.textContent = formatTime(totalSeconds);
  sessionCount.textContent = sessions.length;
  activeDaysEl.textContent = totalSeconds > 0 ? "Yes" : "No";
  average.textContent = formatTime(averageSession);
  longest.textContent = formatTime(longestSession);
  mostActive.textContent =
    firstSession && lastSession
      ? `${formatClock(firstSession.open)} – ${formatClock(lastSession.close)}`
      : "—";
  sessionsPerDay.textContent = totalSeconds > 0 ? "Active" : "No usage";

  const selectedDayLabel = document.querySelector("#selectedDayLabel");
  if (selectedDayLabel) {
    selectedDayLabel.textContent = selectedDay
      ? formatDateLong(selectedDay.date)
      : "No day selected";
  }
}

async function selectDay(date) {
  if (!applicationData) return;

  const selectedDay = applicationData.days.find((day) => day.date === date);
  if (!selectedDay) return;

  const params = new URLSearchParams(window.location.search);
  params.set("date", selectedDay.date);
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${params.toString()}`,
  );

  renderUsage(applicationData, selectedDay.date);
  renderAnalytics(applicationData, selectedDay);
  renderTimeline(selectedDay);
}

async function refresh() {
  if (!applicationData) return;

  const params = new URLSearchParams(window.location.search);
  const application = params.get("app");

  if (!application) return;

  const data = await window.chrona.getApplicationUsage(application, 30);
  applicationData = data;

  const requestedDate = params.get("date");

  const selectedDay =
    data.days.find((day) => day.date === requestedDate) ||
    data.days[data.days.length - 1];

  if (selectedDay) {
    renderUsage(data, selectedDay.date);
    renderAnalytics(data, selectedDay);
    renderTimeline(selectedDay);
  }
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const application = params.get("app");
  const requestedDate = params.get("date");

  if (!application) {
    title.textContent = "Application";
    usageChart.innerHTML = '<div class="empty">No application selected.</div>';
    return;
  }

  title.textContent = application;

  const data = await window.chrona.getApplicationUsage(application, 30);
  applicationData = data;

  const selectedDay =
    data.days.find((day) => day.date === requestedDate) ||
    data.days[data.days.length - 1];

  if (selectedDay) {
    await selectDay(selectedDay.date);
  }

  refreshTimer = setInterval(refresh, 10_000);
}

back.addEventListener("click", () => {
  window.location.href = "usage.html";
});

init();
