// home.js — smart carousel and comeback countdown on the Home page.

const track = document.getElementById("carousel-track");
const dotsBox = document.getElementById("carousel-dots");
const comebackBox = document.getElementById("comeback");
const fmt = (n) => n.toLocaleString("en-US");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let autoTimer = null;

// 1. Load everything the Home page needs, all at once
async function loadHome() {
  try {
    const [voting, goals, songs, videos, settingsRows] = await Promise.all([
      loadTab("voting"),
      loadTab("goals"),
      loadTab("songs"),
      loadTab("videos"),
      loadTab("settings"),
    ]);
    const settings = {};
    settingsRows.forEach((row) => (settings[row.key] = row.value));

    // YOUR ORDER: votes first, then goals, then the latest release
    const slides = [
      ...voteSlides(voting),
      ...goalSlides(goals),
      ...releaseSlides(settings, songs, videos),
    ];
    renderCarousel(slides);
    renderComeback(settings);
    tick();
  } catch (error) {

    console.error(error);
    track.innerHTML =
      '<div class="slide"><p class="slide-label">Could not load. Please refresh in a minute.</p></div>';
  }
}

// 2. Vote slides: open votes, soonest-ending first
function voteSlides(rows) {
  const now = Date.now();
  return rows
    .filter(isShown)
    .map((row) => ({ ...row, end: endTime(row) }))
    .filter((v) => v.end && v.end.getTime() > now)
    .sort((a, b) => a.end - b.end)
    .map((v) => {
      const link = safeLink(v.link);
      const button = link
        ? `<a class="btn" href="${link}" target="_blank" rel="noopener">Vote for YEJI</a>`
        : `<a class="btn" href="voting.html">See how to vote</a>`;
      return `
        <div class="slide">
          <p class="slide-label">Vote now
            <span class="badge" data-badge-end="${v.end.getTime()}" hidden>ENDING TODAY</span>
          </p>
          <h2>${escapeHtml(v.award)}</h2>
          <p class="slide-sub">${escapeHtml(v.category)}</p>
          ${button}
          <p class="slide-countdown" data-end="${v.end.getTime()}"></p>
        </div>`;
    });
}


// 3. Goal slides: active, unfinished goals, soonest deadline first
function goalSlides(rows) {
  const now = Date.now();
  const endOf = (g) => (g.end ? g.end.getTime() : Infinity);
  return rows
    .filter(isShown)
    .map((g) => ({
      ...g,
      currentNum: toNumber(g.current),
      targetNum: toNumber(g.target),
      end: deadlineTime(g.deadline),
    }))
    .filter((g) => g.targetNum > 0 && g.currentNum < g.targetNum)
    .filter((g) => !g.end || g.end.getTime() > now)
    .sort((a, b) => (endOf(a) > endOf(b)) - (endOf(a) < endOf(b)))
    .map((g) => {
      const percent = Math.min(100, (g.currentNum / g.targetNum) * 100);
      return `
        <div class="slide">
          <p class="slide-label">Goal · ${escapeHtml(g.platform)}</p>
          <h2>${escapeHtml(g.title)}</h2>
          <p class="slide-sub">${fmt(g.currentNum)} / ${fmt(g.targetNum)}</p>
          <div class="bar"><div class="bar-fill" style="width:${percent}%"></div></div>
          <p class="slide-sub">${percent.toFixed(1)}% · ${fmt(g.targetNum - g.currentNum)} to go</p>
          <a class="btn" href="goals.html">See all goals</a>
          ${g.end ? `<p class="slide-countdown" data-end="${g.end.getTime()}"></p>` : ""}
        </div>`;
    });
}

// 4. Latest release slide, from era_song_id in the Settings tab
function releaseSlides(settings, songs, videos) {

  const song = songs.find((s) => s.song_id === settings.era_song_id);
  if (!song) return [];
  const title = settings.era_title || song.title;
  const spotifyOk = /^[A-Za-z0-9]+$/.test(song.spotify_id);
  // A video whose title starts with the era title, e.g. "Pocket (Tunnel Vision Tour...)"
  const video = videos.find(
    (v) => isShown(v) &&
      /^[A-Za-z0-9_-]{11}$/.test(v.youtube_id) &&
      v.title.toLowerCase().startsWith(title.toLowerCase())
  );
  return [`
    <div class="slide">
      <p class="slide-label">Latest release</p>
      <h2>${escapeHtml(title)}</h2>
      <p class="slide-sub">${escapeHtml(song.album)}</p>
      <div class="slide-buttons">
        ${spotifyOk ? `<a class="btn" href="https://open.spotify.com/track/${song.spotify_id}" target="_blank" rel="noopener">Listen</a>` : ""}
        ${video ? `<a class="btn btn-secondary" href="https://www.youtube.com/watch?v=${video.youtube_id}" target="_blank" rel="noopener">Watch</a>` : ""}
      </div>
    </div>`];
}

// 5. Put the slides in place, add dots, and start sliding
function renderCarousel(slides) {
  if (slides.length === 0) {
    track.innerHTML = `
      <div class="slide">
        <h2>YEJI Charts</h2>
        <p class="slide-sub">Stream, vote, and push goals for YEJI.</p>
      </div>`;
    return;
  }


  track.innerHTML = slides.join("");
  const slideEls = [...track.children];
  slideEls.forEach((el, i) => {
    el.setAttribute("role", "group");
    el.setAttribute("aria-roledescription", "slide");
    el.setAttribute("aria-label", `${i + 1} of ${slideEls.length}`);
  });

  if (slideEls.length < 2) return; // one slide: no dots, no auto-slide

  dotsBox.innerHTML = slideEls
    .map((_, i) => `<button type="button" class="dot" aria-label="Show slide ${i + 1}"></button>`)
    .join("");
  const dots = [...dotsBox.children];

  dots.forEach((dot, i) =>
    dot.addEventListener("click", () => { goTo(i); stopAuto(); })
  );

  // Light up the dot for whichever slide is showing
  const updateDots = () => {
    const current = Math.round(track.scrollLeft / track.clientWidth);
    dots.forEach((d, i) => {
      d.classList.toggle("active", i === current);
      d.setAttribute("aria-current", i === current);
    });
  };
  track.addEventListener("scroll", updateDots, { passive: true });
  updateDots();

  // Slide by itself every 6 seconds, until the visitor touches the carousel

  if (!reduceMotion) {
    autoTimer = setInterval(() => {
      const current = Math.round(track.scrollLeft / track.clientWidth);
      goTo((current + 1) % slideEls.length);
    }, 6000);
    ["pointerdown", "touchstart", "focusin"].forEach((evt) =>
      track.addEventListener(evt, stopAuto, { passive: true })
    );
  }
}

function goTo(index) {
  track.scrollTo({
    left: index * track.clientWidth,
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

function stopAuto() {
  clearInterval(autoTimer);
  autoTimer = null;
}

// 6. Comeback countdown, from the Settings tab
function renderComeback(settings) {
  if (!settings.countdown_label || !settings.countdown_date) return;
  const time = settings.countdown_time_kst || "00:00";
  const target = new Date(`${settings.countdown_date}T${time}:00+09:00`);
  if (isNaN(target)) return;
  if (target.getTime() < Date.now() - 24 * 60 * 60 * 1000) return; // hide a day after

  const localTime = target.toLocaleString(undefined, {

    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  comebackBox.innerHTML = `
    <p class="slide-label">Countdown</p>
    <h2>${escapeHtml(settings.countdown_label)}</h2>
    <p class="comeback-timer" data-end="${target.getTime()}" data-prefix="" data-done="Out now! 🎉"></p>
    <p class="slide-sub">${localTime} (your time)</p>`;
  comebackBox.hidden = false;
}

// 7. Every countdown on the page ticks here, once per second
function tick() {
  const now = Date.now();
  document.querySelectorAll("[data-end]").forEach((el) => {
    const msLeft = Number(el.dataset.end) - now;
    const prefix = el.dataset.prefix ?? "Ends in";
    el.textContent = msLeft > 0
      ? `${prefix} ${formatTimeLeft(msLeft)}`.trim()
      : el.dataset.done || "Ended";
  });
  document.querySelectorAll("[data-badge-end]").forEach((el) => {
    el.hidden = Number(el.dataset.badgeEnd) - now > 24 * 60 * 60 * 1000;
  });
}

// Start
loadHome();
setInterval(tick, 1000);