// data.js — reads tabs from your published Google Sheet.
// Every page that needs Sheet data loads this file.

// 1. Where your published Sheet lives (from Session 5)
const SHEET_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5ZXxORT7fX5iAwGlxKKYjjefbetJ3xmAfzc0dUuPf4vnZavNpM1ySkjW08RkqUSs-21fCQTqOVfzm/pub";

// 2. Each tab's gid (from Session 5)
const TABS = {
  songs: "729116566",
  videos: "1298032632",
  videoHistory: "439322131",
  goals: "312223254",
  voting: "1950828819",
  playlists: "514115908",
  spotifyHistory: "2012614068",
  settings: "498697270",
};

// 3. Fetch one tab and return its rows as objects,
//    e.g. { award: "AAA 2026", category: "...", show: "TRUE" }
async function loadTab(name) {
  const url = `${SHEET_BASE}?gid=${TABS[name]}&single=true&output=csv`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load the ${name} tab (status ${response.status})`);
  }
  const text = await response.text();
  return rowsToObjects(parseCSV(text));
}

// 4. Turn CSV text into a list of rows.
//    Handles commas inside quotes, like "max 2,000 hearts".

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { cell += char; }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell); cell = "";
    } else if (char === "\n") {
      row.push(cell); rows.push(row); row = []; cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

// 5. Use the header row (row 1) as names for each column,
//    and skip completely empty rows.
function rowsToObjects(rows) {
  const headers = rows[0].map((h) => h.trim());
  return rows

    .slice(1)
    .filter((cells) => cells.some((c) => c.trim() !== ""))
    .map((cells) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = (cells[i] || "").trim()));
      return obj;
    });
}

// 6. Is this row switched on? (show = TRUE)
function isShown(row) {
  return String(row.show).toUpperCase() === "TRUE";
}

// 6. 93784000 ms → "1d 02h 03m 04s"
function formatTimeLeft(ms) {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);

  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

// 7. Safety: show Sheet text as plain text, never as code
function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 8. Safety: only allow real https:// links
function safeLink(url) {
  return /^https:\/\//i.test(url || "") ? escapeHtml(url) : "";
}

// 2. "40,000,000" (text from the Sheet) → 40000000 (a real number)
function toNumber(text) {
  const digits = String(text || "").replace(/[^0-9]/g, "");

  return digits ? Number(digits) : 0;
}

// 2. Turn "2026-11-04" + "23:59" (Korea time) into a real moment in time
function endTime(row) {
  if (!row.end_date) return null;
  const time = row.end_time_kst || "23:59";
  const date = new Date(`${row.end_date}T${time}:00+09:00`);
  return isNaN(date) ? null : date;
}

// 3. A deadline means the end of that day, Korea time
function deadlineTime(dateText) {
  if (!dateText) return null;
  const date = new Date(`${dateText}T23:59:59+09:00`);
  return isNaN(date) ? null : date;
}

// Safety for images: allow https:// links, or files in our own images/ folder
function safeImage(path) {
  const p = String(path || "").trim();
  if (/^https:\/\//i.test(p)) return escapeHtml(p);
  if (/^images\/[a-z0-9._-]+$/i.test(p)) return "/" + p;
  return "";
}