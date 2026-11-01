// spotify.js — totals, daily gains and a chart for the Spotify page.

const statsBox = document.getElementById("song-stats");
const chartBox = document.getElementById("spotify-chart");
const fmt = (n) => n.toLocaleString("en-US");

// 1. Load songs, history and settings at the same time
async function loadSpotify() {
  try {
    const [songs, history, settingsRows] = await Promise.all([
      loadTab("songs"),
      loadTab("spotifyHistory"),
      loadTab("settings"),
    ]);

    // Settings tab → { site_name: "YEJI Charts", era_song_id: "pocket", ... }
    const settings = {};
    settingsRows.forEach((row) => (settings[row.key] = row.value));

    const historyBySong = groupHistory(history);
    const shown = songs
      .filter(isShown)
      .map((song) => ({ ...song, ...summarize(historyBySong[song.song_id] || []) }));

    renderSongs(shown);
    renderChart(shown, historyBySong, settings.era_song_id);
  } catch (error) {
    console.error(error);
    statsBox.innerHTML =
      '<p class="placeholder">Streams could not load. Please refresh in a minute.</p>';
  }
}

// 2. Group history rows by song, oldest → newest, skipping blank rows
function groupHistory(history) {
  const bySong = {};
  history.forEach((row) => {
    const total = toNumber(row.total_streams);
    if (!row.song_id || !row.date || !total) return;
    if (!bySong[row.song_id]) bySong[row.song_id] = [];
    bySong[row.song_id].push({ date: row.date, total });
  });
  Object.values(bySong).forEach((days) =>
    days.sort((a, b) => a.date.localeCompare(b.date))
  );
  return bySong;
}

// 3. Days between two "YYYY-MM-DD" dates
function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

// 4. Latest total, and the gain since the entry before it
function summarize(days) {
  if (days.length === 0) return { total: 0 };
  const latest = days[days.length - 1];
  const result = { total: latest.total, latestDate: latest.date };
  if (days.length >= 2) {
    const previous = days[days.length - 2];
    result.gain = latest.total - previous.total;
    result.gapDays = daysBetween(previous.date, latest.date);
  }
  return result;
}

// 5. "2026-11-02" → "Nov 2"
function shortDate(dateText) {
  return new Date(`${dateText}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
}

// 6. Song list, grouped and sorted by total streams
function renderSongs(songs) {
  const groups = ["Solo", "Collabs & features"];
  statsBox.innerHTML = groups
    .map((group) => {
      const inGroup = songs
        .filter((s) => s.group === group)
        .sort((a, b) => b.total - a.total);
      if (inGroup.length === 0) return "";
      return `<h2 class="group-title">${escapeHtml(group)}</h2>
              <div class="stat-list">${inGroup.map(songRow).join("")}</div>`;
    })
    .join("");
}

function songRow(song) {
  let gainText = "No daily data yet";
  if (song.gain !== undefined) {
    const days = song.gapDays === 1 ? "1 day" : `${song.gapDays} days`;
    gainText = `+${fmt(song.gain)} in ${days}`;
  }
  const validId = /^[A-Za-z0-9]+$/.test(song.spotify_id);
  const tag = validId ? "a" : "div";
  const link = validId
    ? ` href="https://open.spotify.com/track/${song.spotify_id}" target="_blank" rel="noopener"`
    : "";

  return `
    <${tag} class="stat-row"${link}>
      <span>
        <strong>${escapeHtml(song.title)}</strong>
        <small>${escapeHtml(song.album)}</small>
      </span>
      <span class="stat-numbers">
        <strong>${song.total ? fmt(song.total) : "–"}</strong>
        <small>${song.latestDate ? `${gainText} · ${shortDate(song.latestDate)}` : gainText}</small>
      </span>
    </${tag}>`;
}

// 7. Daily gains, only between entries exactly 1 day apart (last 14 days)
function dailyPoints(days) {
  const points = [];
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1].date, days[i].date) === 1) {
      points.push({ date: days[i].date, gain: days[i].total - days[i - 1].total });
    }
  }
  return points.slice(-14);
}

// 8. Chart for the era song, or the first song with enough data
function renderChart(songs, historyBySong, eraSongId) {
  const ids = [eraSongId, ...songs.map((s) => s.song_id)].filter(Boolean);
  for (const id of ids) {
    const points = dailyPoints(historyBySong[id] || []);
    if (points.length > 0) {
      const song = songs.find((s) => s.song_id === id);
      drawChart(song ? song.title : id, points);
      return;
    }
  }
  // Not enough data for any song yet: the chart stays hidden
}

function drawChart(title, points) {
  const max = Math.max(...points.map((p) => p.gain), 1);
  const latest = points[points.length - 1];
  const bars = points
    .map((p, i) => {
      const height = Math.max(2, (Math.max(0, p.gain) / max) * 100);
      const isLatest = i === points.length - 1 ? " latest" : "";
      return `<div class="chart-bar${isLatest}" style="height:${height}%"
                   title="${shortDate(p.date)}: +${fmt(p.gain)}"></div>`;
    })
    .join("");

  chartBox.innerHTML = `
    <p class="chart-label">${escapeHtml(title)} · daily streams</p>
    <p class="chart-latest"><strong>+${fmt(latest.gain)}</strong> on ${shortDate(latest.date)}</p>
    <div class="chart-bars" role="img"
         aria-label="Daily streams for ${escapeHtml(title)}, latest +${fmt(latest.gain)} on ${shortDate(latest.date)}">
      ${bars}
    </div>
    <div class="chart-axis">
      <span>${shortDate(points[0].date)}</span>
      <span>${shortDate(latest.date)}</span>
    </div>`;
  chartBox.hidden = false;
}

// Start
loadSpotify();