// voting.js — builds the vote cards on the Voting page.

const voteList = document.getElementById("vote-list");
let votes = []; // open votes, filled in by loadVotes()

// 1. Load the Voting tab, keep open votes, sort by soonest end
async function loadVotes() {
  try {
    const rows = await loadTab("voting");
    const now = Date.now();
    votes = rows
      .filter(isShown)
      .map((row) => ({ ...row, end: endTime(row) }))
      .filter((v) => v.end && v.end.getTime() > now) // hide expired votes
      .sort((a, b) => a.end - b.end); // soonest first
    render();
  } catch (error) {
    console.error(error);
    voteList.innerHTML =
      '<p class="placeholder">Votes could not load. Please refresh in a minute.</p>';
  }
}

// 3. Draw all cards

function render() {
  if (votes.length === 0) {
    voteList.innerHTML =
      '<p class="placeholder">No open votes right now. Check back soon!</p>';
    return;
  }
  voteList.innerHTML = votes.map(cardHtml).join("");
  updateCountdowns();
}

// 4. One card
function cardHtml(vote, index) {
  const link = safeLink(vote.link);
  const localEnd = vote.end.toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });

  return `
    <article class="vote-card">
      <div class="vote-top">
        <span class="vote-platform">${escapeHtml(vote.platform)}</span>
        <span class="badge" data-badge="${index}" hidden>ENDING TODAY</span>
      </div>
      <h2>${escapeHtml(vote.award)}</h2>
      <p class="vote-category">${escapeHtml(vote.category)}</p>
      <p class="vote-countdown" data-countdown="${index}"></p>
      <p class="vote-local">Ends ${localEnd} (your time)</p>
      ${link
        ? `<a class="btn vote-btn" href="${link}" target="_blank" rel="noopener">VOTE NOW</a>`
        : ""}
      ${vote.how_to ? `<p class="vote-tip">💡 ${escapeHtml(vote.how_to)}</p>` : ""}

    </article>
  `;
}

// 5. Update every countdown; runs every second
function updateCountdowns() {
  const now = Date.now();
  let someoneExpired = false;

  votes.forEach((vote, index) => {
    const msLeft = vote.end.getTime() - now;
    if (msLeft <= 0) { someoneExpired = true; return; }

    const countdown = document.querySelector(`[data-countdown="${index}"]`);
    const badge = document.querySelector(`[data-badge="${index}"]`);
    if (countdown) countdown.textContent = `Ends in ${formatTimeLeft(msLeft)}`;
    if (badge) badge.hidden = msLeft > 24 * 60 * 60 * 1000; // show if under 24h
  });

  // A vote just closed: remove it and redraw
  if (someoneExpired) {
    votes = votes.filter((v) => v.end.getTime() > now);
    render();
  }
}



// Start
loadVotes();
setInterval(updateCountdowns, 1000);