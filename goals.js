// goals.js — builds the goal cards on the Goals page.

const goalList = document.getElementById("goal-list");
let goals = [];

// 1. Load the Goals tab and prepare each goal
async function loadGoals() {
  try {
    const rows = await loadTab("goals");
    const now = Date.now();
    goals = rows
      .filter(isShown)
      .map((row) => ({
        ...row,
        currentNum: toNumber(row.current),
        targetNum: toNumber(row.target),
        end: deadlineTime(row.deadline),
      }))
      .filter((g) => g.targetNum > 0)              // needs a target
      .filter((g) => !g.end || g.end.getTime() > now) // hide finished deadlines
      .sort((a, b) => (a.end || Infinity) - (b.end || Infinity)); // soonest first
    render();
  } catch (error) {
    console.error(error);
    goalList.innerHTML =
      '<p class="placeholder">Goals could not load. Please refresh in a minute.</p>';
  }
}

// 2. "40,000,000" (text from the Sheet) → 40000000 (a real number)
function toNumber(text) {
  const digits = String(text || "").replace(/[^0-9]/g, "");

  return digits ? Number(digits) : 0;
}

// 3. A deadline means the end of that day, Korea time
function deadlineTime(dateText) {
  if (!dateText) return null;
  const date = new Date(`${dateText}T23:59:59+09:00`);
  return isNaN(date) ? null : date;
}

// 4. Draw all cards
function render() {
  if (goals.length === 0) {
    goalList.innerHTML =
      '<p class="placeholder">No active goals right now.</p>';
    return;
  }
  goalList.innerHTML = goals.map(cardHtml).join("");
  updateCountdowns();
}

// 5. One card
function cardHtml(goal, index) {
  const percent = Math.min(100, (goal.currentNum / goal.targetNum) * 100);
  const reached = goal.currentNum >= goal.targetNum;
  const toGo = Math.max(0, goal.targetNum - goal.currentNum);
  const image = safeLink(goal.image_url);
  const fmt = (n) => n.toLocaleString("en-US");

  return `
    <article class="goal-card ${reached ? "reached" : ""}">
      ${image ? `<img class="goal-img" src="${image}" alt="" loading="lazy">` : ""}

      <p class="goal-platform">${escapeHtml(goal.platform)}</p>
      <h2>${escapeHtml(goal.title)}</h2>

      <p class="goal-numbers">
        <strong>${goal.currentNum ? fmt(goal.currentNum) : "Waiting for data"}</strong>
        <span> / ${fmt(goal.targetNum)}</span>
      </p>

      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${percent.toFixed(1)}">
        <div class="bar-fill" style="width: ${percent}%"></div>
      </div>

      <div class="goal-meta-row">
        <span>${percent.toFixed(1)}%</span>
        <span>${reached ? "Goal reached 🎉" : `${fmt(toGo)} to go`}</span>
      </div>

      ${goal.end && !reached
        ? `<p class="goal-countdown" data-countdown="${index}"></p>` : ""}
    </article>
  `;
}

// 6. Tick the countdowns every second
function updateCountdowns() {
  const now = Date.now();
  goals.forEach((goal, index) => {
    const el = document.querySelector(`[data-countdown="${index}"]`);
    if (el && goal.end) {
      const msLeft = goal.end.getTime() - now;
      el.textContent = msLeft > 0 ? `${formatTimeLeft(msLeft)} left` : "Deadline passed";

    }
  });
}

// Start
loadGoals();
setInterval(updateCountdowns, 1000);