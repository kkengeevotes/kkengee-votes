// data.js — reads tabs from your published Google Sheet.
// Every page that needs Sheet data loads this file.

// 1. Where your published Sheet lives (from Session 5)
const SHEET_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5ZXxORT7fX5iAwGlxKKYjjefbetJ3xmAfzc0dUuPf4vnZavNpM1ySkjW08RkqUSs-21fCQTqOVfzm/pub";

// 2. Each tab's gid (from Session 5)
const TABS = {
  songs: "729116566",
  videos: "1298032632",
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