// stream.js — playlists and songs on the Stream guide page.

async function loadStreamGuide() {
  try {
    // Load both tabs at the same time, not one after the other
        const [playlists, songs, settingsRows] = await Promise.all([
      loadTab("playlists"),
      loadTab("songs"),
      loadTab("settings"),
    ]);
    const settings = {};
    settingsRows.forEach((row) => (settings[row.key] = row.value));
    renderStationhead(settings);
    renderPlaylists(playlists.filter(isShown));
    renderSongs(songs.filter(isShown));
  } catch (error) {
    console.error(error);
    document.getElementById("song-list").innerHTML =
      '<p class="placeholder">Could not load. Please refresh in a minute.</p>';
  }
}

// Playlists: one tappable row each
function renderPlaylists(playlists) {
  const box = document.getElementById("playlist-list");
  if (playlists.length === 0) {
    box.innerHTML = '<p class="placeholder">Playlists coming soon.</p>';
    return;
  }
  box.innerHTML = playlists
    .map((p) => {
      const link = safeLink(p.url);
      if (!link) return "";
      return `
        <a class="link-row" href="${link}" target="_blank" rel="noopener">
          <span>

            <strong>${escapeHtml(p.name)}</strong>
            ${p.made_by ? `<small>by ${escapeHtml(p.made_by)}</small>` : ""}
          </span>
          <span class="link-tag">${escapeHtml(p.platform)}</span>
        </a>`;
    })
    .join("");
}

// Songs: grouped into Solo and Collabs & features
function renderSongs(songs) {
  const groups = ["Solo", "Collabs & features"];
  document.getElementById("song-list").innerHTML = groups
    .map((group) => {
      const inGroup = songs.filter((s) => s.group === group);
      if (inGroup.length === 0) return "";
      const rows = inGroup
        .map((s) => {
          // Spotify IDs are letters and numbers only; anything else is skipped
          if (!/^[A-Za-z0-9]+$/.test(s.spotify_id)) return "";
          return `
            <a class="link-row" href="https://open.spotify.com/track/${s.spotify_id}"
               target="_blank" rel="noopener">
              <span>
                <strong>${escapeHtml(s.title)}</strong>
                <small>${escapeHtml(s.album)}</small>
              </span>
              <span class="link-tag">Spotify</span>
            </a>`;
        })
        .join("");
      return `<h3 class="group-title">${escapeHtml(group)}</h3><div class="link-list">${rows}</div>`;

    })
    .join("");
}

loadStreamGuide();