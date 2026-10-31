// layout.js — the shared header and footer for every page.
// Edit the menu or footer HERE, and every page updates.

// 1. The menu: [page file name, label shown]
const menuItems = [
  ["voting", "Voting"],
  ["goals", "Goals"],
  ["spotify", "Spotify"],
  ["youtube", "YouTube"],
  ["stream", "Stream guide"],
];

// 2. Which page are we on? "/voting.html" or "/voting" both become "voting"
const currentPage =
  window.location.pathname.split("/").pop().replace(".html", "") || "index";

// 3. Build the menu links, marking the current page
const menuHtml = menuItems
  .map(([file, label]) => {
    const active = file === currentPage ? ' class="active" aria-current="page"' : "";
    return `<a href="${file}.html"${active}>${label}</a>`;
  })
  .join("");

// 4. Put the header into the page
document.getElementById("site-header").innerHTML = `
  <a href="index.html" class="logo">YEJI Charts</a>
  <nav class="menu">${menuHtml}</nav>
`;

// 5. Put the footer into the page
document.getElementById("site-footer").innerHTML = `

  <p>Unofficial fan site. Not affiliated with YEJI, ITZY, or JYP Entertainment.
  All music, videos and images belong to their respective owners.
  Data from Spotify, YouTube and kworb.net.</p>
  <p>Questions or corrections? Reach us on X:
  <a href="https://x.com/kkengeevotes">@kkengeevotes</a></p>
`;