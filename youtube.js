// youtube.js — video cards with total views and daily gains.

const videoList = document.getElementById("video-list");
let videos = [];
let activeType = "All";

// 1. Load both tabs at once, then prepare each video
async function loadVideos() {
  try {
    const [rows, history, settingsRows] = await Promise.all([
      loadTab("videos"),
      loadTab("videoHistory"),
      loadTab("settings"),
    ]);
    const settings = {};
    settingsRows.forEach((row) => (settings[row.key] = row.value));
    const gains = dailyGains(history);

    videos = rows
      .filter(isShown)
      .filter((v) => /^[A-Za-z0-9_-]{11}$/.test(v.youtube_id)) // real YouTube IDs only
      .map((v) => ({
        ...v,
        viewsNum: toNumber(v.views),
        gain: gains[v.video_id], // undefined until there are 2 days of history
      }))
      .sort((a, b) => b.viewsNum - a.viewsNum); // most viewed first

    render();
    showLastUpdated(rows);
    renderVideoChart(rows, history, settings.chart_video_id || "air-mv");
  } catch (error) {
    console.error(error);
    videoList.innerHTML =
      '<p class="placeholder">Videos could not load. Please refresh in a minute.</p>';
  }

}

// 2. Daily gain = latest day's views minus the day before
//    history rows look like: { date: "2026-11-02", video_id: "air-mv", views: "22,700,000" }
function dailyGains(history) {
  const byVideo = {};
  history.forEach((row) => {
    if (!byVideo[row.video_id]) byVideo[row.video_id] = [];
    byVideo[row.video_id].push({ date: row.date, views: toNumber(row.views) });
  });

  const gains = {};
  Object.entries(byVideo).forEach(([videoId, days]) => {
    days.sort((a, b) => a.date.localeCompare(b.date)); // oldest → newest
    if (days.length >= 2) {
      const latest = days[days.length - 1];
      const previous = days[days.length - 2];
      gains[videoId] = latest.views - previous.views;
    }
  });
  return gains;
}

// 3. Draw the cards for the selected filter
function render() {
  const shown = activeType === "All"
    ? videos
    : videos.filter((v) => v.type === activeType);

  if (shown.length === 0) {
    videoList.innerHTML = '<p class="placeholder">No videos in this category yet.</p>';
    return;

  }
  videoList.innerHTML = shown.map(cardHtml).join("");
}

// 4. One card
function cardHtml(video) {
  const id = video.youtube_id; // already checked: letters, numbers, - and _ only
  const fmt = (n) => n.toLocaleString("en-US");
  const gainText = video.gain === undefined
    ? "Daily gain starts tomorrow"
    : `+${fmt(video.gain)} since yesterday`;

  return `
    <a class="video-card" href="https://www.youtube.com/watch?v=${id}"
       target="_blank" rel="noopener">
      <img class="video-thumb" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg"
           alt="" loading="lazy">
      <div class="video-info">
        <span class="video-type">${escapeHtml(video.type)}</span>
        <h2>${escapeHtml(video.title)}</h2>
        <p class="video-views">
          <strong>${video.viewsNum ? fmt(video.viewsNum) : "–"}</strong> views
        </p>
        <p class="video-gain">${gainText}</p>
      </div>
    </a>
  `;
}

// 5. "Last updated" line under the list (newest time in the Videos tab)
function showLastUpdated(rows) {
  const times = rows.map((r) => r.last_updated).filter(Boolean).sort();

  const latest = times[times.length - 1];
  document.getElementById("last-updated").textContent =
    latest ? `Views last updated ${latest}` : "";
}

// 5b. Bar chart of daily views for the chosen video
function renderVideoChart(rows, history, videoId) {
  const days = history
    .filter((r) => r.video_id === videoId)
    .map((r) => ({ date: r.date, total: toNumber(r.views) }))
    .filter((d) => d.date && d.total)
    .sort((a, b) => a.date.localeCompare(b.date));
  const points = dailyPoints(days);
  if (points.length === 0) return; // needs 2 days in a row first

  const video = rows.find((v) => v.video_id === videoId);
  const title = video ? `${video.title}${video.type === "MV" ? " MV" : ""}` : videoId;
  const box = document.getElementById("youtube-chart");
  box.innerHTML = chartHtml(title, "daily views", points);
  box.hidden = false;
}

// 6. Filter tabs: remember the choice and redraw
document.querySelectorAll(".filter-tab").forEach((button) => {
  button.setAttribute("aria-pressed", button.classList.contains("active"));
  button.addEventListener("click", () => {
    activeType = button.dataset.type;
    document.querySelectorAll(".filter-tab").forEach((b) => {
      b.classList.toggle("active", b === button);
      b.setAttribute("aria-pressed", b === button);
    });
    render();
  });
});

// Start
loadVideos();