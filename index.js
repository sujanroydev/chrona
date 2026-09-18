import { isUserActive } from "./src/tracker.js";
import { addUsage } from "./src/storage.js";

const INTERVAL = 10_000; // 10 seconds
const IDLE_LIMIT = 5 * 60 * 1000; // 5 minutes

console.log("Laptop Time Tracker");
console.log("-------------------");
console.log("Tracking started.");
console.log("Idle after 5 minutes.");
console.log();

let lastState = null;

function check() {
  try {
    const active = isUserActive(IDLE_LIMIT);

    if (active) {
      addUsage(INTERVAL / 1000);

      if (lastState !== "active") {
        console.log("● Active");
        lastState = "active";
      }
    } else {
      if (lastState !== "idle") {
        console.log("○ Idle");
        lastState = "idle";
      }
    }
  } catch (error) {
    console.error("Tracker error:", error.message);
  }
}

check();

setInterval(check, INTERVAL);
