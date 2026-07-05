const input = document.getElementById("search");
const dropdown = document.getElementById("dropdown");
const board = document.getElementById("board");
const lastGuess = document.getElementById("lastGuess");
const guessCounter = document.getElementById("guessCounter");
const message = document.getElementById("message");
const gameTitle = document.getElementById("gameTitle");
const hint = document.getElementById("hint");
const menu = document.getElementById("menu");

let gameLocked = false;

let gameOutcome = null; 
// "win" | "giveup"

let hintedPlayer = null;
let testOffset = 0;

let testDayOffset = 0;

let GAME;

function initGame() {
  const selectedDate = getSelectedDate();
  GAME = getDailyGameFromDate(selectedDate);
}

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

const YEARS = [
  1970, 1971, 1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979,
  1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989,
  1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 
  2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
  2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 
  2020, 2021, 2022, 2023, 2024, 2025, 2026
];

const DECADES = [1970, 1980, 1990, 2000, 2010];



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

function getDailyGameFromDate(dateString) {
  const seed = getEasternDayNumberFromDate(dateString);

  const stat = pick(seed, STATS);

  const mode = pick(seed + 1, ["season", "decade", "career"]);

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

let selectedDate = getSelectedDate();


/* =========================
   STORAGE
========================= */
let GAME_KEY = `mlb-${selectedDate}`;

function getSelectedDate() {
  const params = new URLSearchParams(window.location.search);
  const urlDate = params.get("date");

  if (urlDate) return urlDate;

  return new Date().toISOString().split("T")[0];
}

function loadGame() {
  const saved = localStorage.getItem(`${GAME_KEY}-guesses`);
  if (saved) guesses = JSON.parse(saved);
}

function saveGame() {
  localStorage.setItem(`${GAME_KEY}-guesses`, JSON.stringify(guesses));
}

function markGameComplete(dateString) {
  localStorage.setItem(`mlb_completed_${dateString}`, "true");
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}


/* =========================
   RESET DAILY GAME
========================= */

function resetIfNewGame() {
  const currentGameId = getEasternDayNumber();
  const savedGameId = localStorage.getItem("mlb-game-id");

  if (savedGameId != currentGameId) {
    localStorage.setItem("mlb-game-id", currentGameId);

    localStorage.removeItem(`${GAME_KEY}-guesses`);
    localStorage.removeItem(`${GAME_KEY}-win`);
    localStorage.removeItem("mlb-win");

    hint.textContent = "";
    guesses = [];
  }
}

function getEasternDayNumberFromDate(dateString) {
  const date = new Date(dateString);

  const easternDate = new Date(
    new Date(date).toLocaleString("en-US", {
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
  if (typeof rank !== "number") return "other";

  if (rank <= 5) return "top5";
  if (rank <= 10) return "top10";
  if (rank <= 25) return "top25";

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

  if (gameLocked) {
    message.textContent = "This game is locked.";
    return;
  }
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

    gameOutcome = "win";

    
    gameLocked = true;
    localStorage.setItem(`mlb_outcome_${selectedDate}`, "win");
    applyLockUI();

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
  const outcomeText =
    gameOutcome === "giveup"
      ? "Gave Up ❌"
      : "Solved ✅";

  const text =
  `MLB Guess 5
  ${outcomeText}
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
  const title = document.getElementById("winTitle");

  title.textContent = "You Win!";
  
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
    board.appendChild(createLeaderboardRow(g));
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
  testDayOffset++;

  const base = new Date();
  base.setDate(base.getDate() + testDayOffset);

  const nextDate = base.toISOString().split("T")[0];

  selectedDate = nextDate;
  GAME_KEY = `mlb-${selectedDate}`;

  GAME = getDailyGameFromDate(nextDate);

  guesses = [];
  matches = [];
  leaderboard = [];

  gameOutcome = null;
  gameLocked = false;

  input.disabled = false;
  input.placeholder = "Guess a player...";

  input.value = "";
  message.textContent = "";
  hint.textContent = "";

  await loadLeaderboard();
});

document.getElementById("resetGameBtn").addEventListener("click", async () => {
  const confirmReset = confirm("Reset current game data?");

  if (!confirmReset) return;

  // clear runtime state
  guesses = [];
  matches = [];
  leaderboard = [];

  gameOutcome = null;
  gameLocked = false;

  // clear saved data
  localStorage.removeItem(`mlb-guesses`);
  localStorage.removeItem(`mlb-win`);
  localStorage.removeItem(`mlb_outcome_${selectedDate}`);
  localStorage.removeItem(`${GAME_KEY}-guesses`);

  // reset UI
  input.value = "";
  message.textContent = "";
  hint.textContent = "";

  input.disabled = false;
  input.placeholder = "Guess a player...";

  await loadLeaderboard();
  render();
  renderLastGuess();
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



function openLeaderboard() {
  // close win popup
  document.getElementById("winPopup").style.display = "none";

  const popup = document.getElementById("leaderboardPopup");
  const list = document.getElementById("leaderboardList");

  // sort leaderboard (safely)
  const sorted = [...leaderboard].sort((a, b) => {
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  });

  list.innerHTML = "";

  sorted.forEach(p => {
    list.appendChild(createLeaderboardRow(p));
  });

  popup.classList.remove("hidden");
  popup.style.display = "flex";
}

function closeLeaderboard() {
  const popup = document.getElementById("leaderboardPopup");
  popup.classList.add("hidden");
  popup.style.display = "none";
}

function createLeaderboardRow(p) {
  const div = document.createElement("div");

  div.className = `row ${getColorClass(p.rank)}`;

  div.innerHTML = `
    <div class="rank">${p.rank ?? "-"}</div>
    <div class="name">${p.name}</div>
    <div class="value">${p.value}</div>
  `;

  return div;
}

document.getElementById("giveUpBtn").addEventListener("click", () => {
  openGiveUpPopup();
});



function openGiveUpPopup() {
  const popup = document.getElementById("winPopup");
  const title = document.getElementById("winTitle");
  const scoreStats = document.getElementById("scoreStats");
  gameOutcome = "giveup";
  title.textContent = "You Gave Up!";
 
  gameLocked = true;
  localStorage.setItem(`mlb_outcome_${selectedDate}`, "giveup");
  applyLockUI();
  // still show stats (optional — you can remove if you want)
  let green = 0, yellow = 0, red = 0, gray = 0;

  guesses.forEach(g => {
    const rank = g.rank;

    if (typeof rank !== "number") {
      gray++;
    } else if (rank <= 5) {
      green++;
    } else if (rank <= 10) {
      yellow++;
    } else if (rank <= 25) {
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

function loadOutcomeLock() {
  const outcome = localStorage.getItem(`mlb_outcome_${selectedDate}`);

  if (outcome === "win" || outcome === "giveup") {
    gameLocked = true;
  }
}

function applyLockUI() {
  if (gameLocked) {
    input.disabled = true;
    input.placeholder = "Game finished";
  }
}
/* =========================
   INIT
========================= */
initGame();
loadOutcomeLock();
resetIfNewGame();
loadGame();
loadLeaderboard();
applyLockUI();