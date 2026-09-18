const today = document.querySelector("#today");
const yesterday = document.querySelector("#yesterday");
const week = document.querySelector("#week");
const status = document.querySelector("#status");
const statusText = document.querySelector("#statusText");
const toggle = document.querySelector("#toggle");

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
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

toggle.addEventListener("click", async () => {
  const state = await window.chrona.getState();
  window.chrona.toggleTracking(!state.tracking);
});

window.chrona.onState(render);

window.chrona.getState().then(render);
