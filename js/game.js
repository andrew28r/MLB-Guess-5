const input = document.getElementById("search");
const dropdown = document.getElementById("dropdown");
const board = document.getElementById("board");
const lastGuess = document.getElementById("lastGuess");
const guessCounter = document.getElementById("guessCounter");
const message = document.getElementById("message");
const gameTitle = document.getElementById("gameTitle");
const hint = document.getElementById("hint");
const menu = document.getElementById("menu");

let hintedPlayer = null;
let testOffset = 0;



/* =========================
   CONFIG
========================= */

const STATS = [
  { stat: "homeRuns", title: "Home Runs", group: "hitting" },
  { stat: "rbi", title: "RBI", group: "hitting" },
  { stat: "hits", title: "Hits", group: "hitting" },
  { stat: "doubles", title: "Doubles", group: "hitting" },
  { stat: "stolenBases", title: "Stolen Bases", group: "hitting" },
  { stat: "wins", title: "Wins", group: "pitching" },
  { stat: "strikeOuts", title: "Strikeouts", group: "pitching" },
  { stat: "saves", title: "Saves", group: "pitching" }
];

const YEARS = [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const DECADES = [1980, 1990, 2000, 2010];



/* =========================
   SEED SYSTEM
========================= */

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick(seed, arr) {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

function getEasternDayNumber() {
  const easternDate = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York"
    })
  );

  return Math.floor(
    new Date(
      easternDate.getFullYear(),
      easternDate.getMonth(),
      easternDate.getDate()
    ).getTime() / 86400000
  );
}



/* =========================
   GAME GENERATOR
========================= */

function getDailyGame() {
  const seed = getEasternDayNumber() + testOffset;

  const stat = pick(seed, STATS);

  const mode = pick(seed + 1, [
    "season",
    "decade",
    "career"
  ]);

  const game = {
    group: stat.group,
    sortStat: stat.stat
  };

  if (mode === "career") {
    game.stats = "career";
    game.title = `Most Career ${stat.title}`;
  }

  if (mode === "season") {
    const year = pick(seed + 2, YEARS);
    game.stats = "season";
    game.season = year;
    game.title = `Most ${stat.title} in ${year}`;
  }

  if (mode === "decade") {
    const decade = pick(seed + 3, DECADES);
    game.stats = "byDateRange";
    game.startDate = `${decade}-01-01`;
    game.endDate = `${decade + 9}-12-31`;
    game.title = `Most ${stat.title} in the ${decade}s`;
  }

  return game;
}



/* =========================
   STATE
========================= */

let leaderboard = [];
let guesses = [];
let matches = [];
let activeIndex = -1;
let searchTimeout = null;

let GAME = getDailyGame();



/* =========================
   STORAGE
========================= */

function loadGame() {
  const saved = localStorage.getItem("mlb-guesses");
  if (saved) guesses = JSON.parse(saved);
}

function saveGame() {
  localStorage.setItem("mlb-guesses", JSON.stringify(guesses));
}



/* =========================
   RESET DAILY GAME
========================= */

function resetIfNewGame() {
  const currentGameId = getEasternDayNumber();
  const savedGameId = localStorage.getItem("mlb-game-id");

  if (savedGameId != currentGameId) {
    localStorage.setItem("mlb-game-id", currentGameId);
    localStorage.removeItem("mlb-guesses");
    localStorage.removeItem("mlb-win");
    hint.textContent = "";
    guesses = [];
  }
}



/* =========================
   LEADERBOARD
========================= */

async function loadLeaderboard() {
  let url =
    `https://statsapi.mlb.com/api/v1/stats?` +
    `stats=${GAME.stats}` +
    `&group=${GAME.group}` +
    `&sportId=1` +
    `&sortStat=${GAME.sortStat}` +
    `&order=desc` +
    `&limit=1000`;

  if (GAME.startDate) url += `&startDate=${GAME.startDate}`;
  if (GAME.endDate) url += `&endDate=${GAME.endDate}`;
  if (GAME.season) url += `&season=${GAME.season}`;
  //if (GAME.stats === "byDateRange") url += `&playerPool=all`;

  url += "&playerPool=all";

  const res = await fetch(url);
  const data = await res.json();

  const leaders = data.stats?.[0]?.splits || [];

  leaderboard = leaders.map((p, i) => ({
    rank: i + 1,
    name: p.player.fullName,
    value: Number(p.stat[GAME.sortStat] || 0),
    team: p.team?.name || "Unknown"
  }));

  gameTitle.textContent = GAME.title;

  render();
  lastGuess.innerHTML = "";
  guessCounter.textContent = `Guesses: ${guesses.length}`;

  if (leaderboard.length) checkWin();
}



/* =========================
   SEARCH
========================= */

async function searchPlayers(query) {
  const q = query.trim();

  if (q.length < 2) {
    matches = [];
    renderDropdown();
    return;
  }

  try {
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(q)}`
    );

    const data = await res.json();

    matches = (data.people || [])
      .map(p => ({
        name: p.fullName,
        id: p.id
      }))
      .slice(0, 8);

  } catch {
    matches = [];
  }

  activeIndex = -1;
  renderDropdown();
}



/* =========================
   UI HELPERS
========================= */

function getColorClass(rank) {
  if (rank <= 5) return "top5";
  if (rank <= 10) return "top10";
  if (rank <= 25) return "top25";
  if (rank == "-") return "other";
  return "ranked";
}
function renderDropdown() {
  dropdown.innerHTML = "";

  if (!matches.length) {
    dropdown.style.display = "none";
    return;
  }

  matches.forEach((player, index) => {
    const div = document.createElement("div");
    div.className = "item";

    if (index === activeIndex) div.classList.add("active");

    const img = document.createElement("img");
    img.src = getHeadshot(player.id);
    img.className = "dropdown-headshot";

    img.onerror = () => {
      img.src =
        "https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/default/headshot/0/current";
    };

    const span = document.createElement("span");
    span.textContent = player.name;

    div.appendChild(img);
    div.appendChild(span);

    div.onclick = () => {
      input.value = player.name;
      dropdown.style.display = "none";
      guessPlayer();
    };

    dropdown.appendChild(div);
  });

  dropdown.style.display = "block";
}
function getHeadshot(playerId) {
  return `https://img.mlbstatic.com/mlb/images/players/head_shot/${playerId}.jpg`;
}



/* =========================
   GAME LOGIC
========================= */

async function guessPlayer() {
  const value = input.value.trim();
  if (!value) return;

  const normalized = value.toLowerCase();

  const already = guesses.some(g => g.name.toLowerCase() === normalized);
  if (already) {
    message.textContent = `Already guessed: ${value}`;
    input.value = "";
    dropdown.style.display = "none";
    return;
  }

  // VALIDATE AGAINST MLB API
  const validPlayer = await validatePlayerName(value);

  if (!validPlayer) {
    message.textContent = `❌ "${value}" is not a valid MLB player`;
    input.value = "";
    dropdown.style.display = "none";
    return;
  }

  if (
    hintedPlayer &&
    validPlayer.fullName.toLowerCase() === hintedPlayer.name.toLowerCase()
  ) {
    hint.textContent = "";
    hintedPlayer = null;
  }
  
  // now check leaderboard AFTER validation
  const player = leaderboard.find(
    p => p.name.toLowerCase() === normalized
  );

  guesses.unshift(
    player || {
      rank: null,
      name: validPlayer.fullName,
      value: "-"
    }
  );

  message.textContent = "";

  render();
  guessCounter.textContent = `Guesses: ${guesses.length}`;

  checkWin();
  renderLastGuess();

  input.value = "";
  dropdown.style.display = "none";
  saveGame();
}

async function validatePlayerName(name) {
  const res = await fetch(
    `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(name)}`
  );

  const data = await res.json();

  const people = data.people || [];

  // find exact match (case-insensitive)
  const match = people.find(
    p => p.fullName.toLowerCase() === name.toLowerCase()
  );

  return match || null;
}

function checkWin() {
  const topFive = leaderboard
    .filter(p => p.rank <= 5)
    .map(p => p.name.toLowerCase());

  const guessed = guesses.map(g => g.name.toLowerCase());

  if (topFive.every(n => guessed.includes(n))) {
    openPopup();
  }
}

function closePopup() {
  document.getElementById("winPopup").style.display = "none";
}


function shareResults() {
  let green = 0;
  let yellow = 0;
  let red = 0;
  let gray = 0;

  guesses.forEach(g => {
    const rank = g.rank;

    if (typeof rank !== "number") {
      gray++;
    } else if (rank <= 5) {
      green++;
    } else if (rank <= 10) {
      yellow++;
    } else if (rank <=25) {
      red++;
    } else {
      gray++;
    }
  });

  const text =
`MLB Guess 5
Total guesses: ${guesses.length}
🟢 ${green}
🟡 ${yellow}
🔴 ${red}
⚫ ${gray}
Game: ${GAME.title}`;

  navigator.clipboard.writeText(text)
    .then(() => {
      alert("Copied to clipboard!");
    })
    .catch(() => {
      alert("Copy failed");
    });
}

function openPopup() {
  const popup = document.getElementById("winPopup");
  const scoreStats = document.getElementById("scoreStats");

  let green = 0;
  let yellow = 0;
  let red = 0;
  let gray = 0;

  guesses.forEach(g => {
    const rank = g.rank;

    if (typeof rank !== "number") {
      gray++;
    } else if (rank <= 5) {
      green++;
    } else if (rank <= 10) {
      yellow++;
    } else if (rank <=25) {
      red++;
    } else {
      gray++;
    }
  });

  scoreStats.innerHTML = `
    <div class="score-row">
      Total guesses: ${guesses.length}
    </div>
    <div class="score-row">
      <span class="dot green"></span> ${green}
    </div>

    <div class="score-row">
      <span class="dot yellow"></span> ${yellow}
    </div>

    <div class="score-row">
      <span class="dot red"></span> ${red}
    </div>

    <div class="score-row">
      <span class="dot gray"></span> ${gray}
    </div>
  `;

  popup.style.display = "flex";
}



/* =========================
   RENDER
========================= */

function render() {
  board.innerHTML = "";

  const sorted = [...guesses].sort((a, b) => {
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  });

  sorted.forEach(g => {
    const div = document.createElement("div");
    div.className = `row ${g.rank ? getColorClass(g.rank) : "other"}`;

    div.innerHTML = `
      <div class="rank">${g.rank ?? "-"}</div>
      <div class="name">${g.name}</div>
      <div class="value">${g.value}</div>
    `;

    board.appendChild(div);
  });
}

function renderLastGuess() {
  lastGuess.innerHTML = "";

  if (!guesses.length) return;

  const g = guesses[0];

  const div = document.createElement("div");

  div.className = `rowGuess ${
    typeof g.rank === "number" ? getColorClass(g.rank) : "other"
  }`;

  div.innerHTML = `
    <div class="rank">${g.rank ?? "-"}</div>
    <div class="name">${g.name}</div>
    <div class="value">${g.value}</div>
  `;

  lastGuess.appendChild(div);
}



/* =========================
   DOCUMENT EVENTS
========================= */

document.getElementById("testGameBtn").addEventListener("click", async () => {
  testOffset++;

  GAME = getDailyGame();

  guesses = [];
  matches = [];
  leaderboard = [];

  input.value = "";
  message.textContent = "";
  hint.textContent = "";

  await loadLeaderboard();
});

document.getElementById("resetGameBtn").addEventListener("click", async () => {
  localStorage.removeItem("mlb-guesses");
  localStorage.removeItem("mlb-win");
  
  guesses = [];
  matches = [];
  leaderboard = [];

  input.value = "";
  message.textContent = "";
  hint.textContent = "";

  await loadLeaderboard();
});

document.getElementById("backBtn").onclick = () => {
    window.location.href = "index.html";
};

document.getElementById("menuBtn").onclick = () => {
    menu.classList.toggle("hidden");
};

document.getElementById("hintBtn").addEventListener("click", () => {
    const guessed = guesses.map(g => g.name.toLowerCase());

    const player = leaderboard
        .filter(p => p.rank <= 5)
        .reverse()
        .find(p => !guessed.includes(p.name.toLowerCase()));

    if (!player) {
        hint.textContent = "All Top 5 players have been guessed!";
        return;
    }

    hintedPlayer = player;
    hint.textContent = `Hint: ${player.team}`;
    
    const menu = document.getElementById("menu");
    menu.classList.add("hidden");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".container")) {
    dropdown.style.display = "none";
  }
});


document.addEventListener("click", (e) => {
    const menu = document.getElementById("menu");
    const wrapper = document.querySelector(".menu-wrapper");

    if (!wrapper.contains(e.target)) {
        menu.classList.add("hidden");
    }
});



/* =========================
   INPUT EVENTS
========================= */

input.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchPlayers(input.value);
  }, 150);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    activeIndex = Math.min(activeIndex + 1, matches.length - 1);
    renderDropdown();
  }

  if (e.key === "ArrowUp") {
    activeIndex = Math.max(activeIndex - 1, 0);
    renderDropdown();
  }

  if (e.key === "Enter") {
    e.preventDefault();

    if (activeIndex >= 0 && matches[activeIndex]) {
      input.value = matches[activeIndex].name;
      guessPlayer();
      return;
    }

    guessPlayer();
  }
});



/* =========================
   INIT
========================= */

resetIfNewGame();
loadGame();
loadLeaderboard();
