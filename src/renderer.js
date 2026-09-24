const today = document.querySelector("#today");
const yesterday = document.querySelector("#yesterday");
const week = document.querySelector("#week");
const status = document.querySelector("#status");
const statusText = document.querySelector("#statusText");
const toggle = document.querySelector("#toggle");
const usageButton = document.querySelector("#usageButton");
const activeApps = document.querySelector("#activeApps");
const sessions = document.querySelector("#sessions");
const topApp = document.querySelector("#topApp");
const topAppTime = document.querySelector("#topAppTime");

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
}

function render(state) {
  today.textContent = formatTime(state.today);
  yesterday.textContent = formatTime(state.yesterday);
  week.textContent = formatTime(state.week);

  status.classList.toggle("active", state.active);
  statusText.textContent = !state.tracking
    ? "Tracking paused"
    : state.active
      ? "Currently active"
      : "Currently idle";

  toggle.textContent = state.tracking ? "Pause tracking" : "Resume tracking";
}

async function renderAnalytics() {
  const date = new Date();
  const dateKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  const day = await window.chrona.getDayUsage(dateKey);
  const usedApps = day.apps.filter((app) => app.seconds > 0);
  const top = usedApps[0];
  const sessionCount = day.sessions.length;

  activeApps.textContent = usedApps.length;
  sessions.textContent = sessionCount;
  topApp.textContent = top ? top.name : "—";
  topApp.title = top ? top.name : "";
  topAppTime.textContent = top ? formatTime(top.seconds) : "0m";
}

toggle.addEventListener("click", async () => {
  const state = await window.chrona.getState();
  window.chrona.toggleTracking(!state.tracking);
});

usageButton.addEventListener("click", () => {
  window.location.href = "usage.html";
});

window.chrona.onState(render);

window.chrona.getState().then(render);
renderAnalytics();
