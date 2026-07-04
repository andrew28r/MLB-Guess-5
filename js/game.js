const input = document.getElementById("search");
const dropdown = document.getElementById("dropdown");
const board = document.getElementById("board");
const lastGuess = document.getElementById("lastGuess");
const guessCounter = document.getElementById("guessCounter");
const message = document.getElementById("message");
const gameTitle = document.getElementById("gameTitle");

const GAMES = [
  {
    title: "Most Career RBI All-Time",
    stats: "career",
    group: "hitting",
    sortStat: "rbi"
  },
  {
    title: "Most Home Runs in 2021",
    stats: "season",
    group: "hitting",
    sortStat: "homeRuns",
    season: 2021
  },

  {
    title: "Most Stolen Bases in 2021",
    stats: "season",
    group: "hitting",
    sortStat: "stolenBases",
    season: 2021
  },
  
  {
    title: "Most Career Home Runs All-Time",
    stats: "career",
    group: "hitting",
    sortStat: "homeRuns"
  },
  {
    title: "Most Stolen Bases All-Time",
    stats: "career",
    group: "hitting",
    sortStat: "stolenBases"
  },
  {
    title: "Most Doubles Since 2020",
    stats: "byDateRange",
    group: "hitting",
    sortStat: "doubles",
    startDate: "2020-01-01",
    endDate: "2026-12-31"
  },
  {
    title: "Most Strikeouts in the 90s",
    stats: "byDateRange",
    group: "pitching",
    sortStat: "strikeOuts",
    startDate: "1990-01-01",
    endDate: "1999-12-31"
  },
  
  {
    title: "Most Strikeouts in the 80s",
    stats: "byDateRange",
    group: "pitching",
    sortStat: "strikeOuts",
    startDate: "1980-01-01",
    endDate: "1989-12-31"
  },
  
  {
    title: "Most Strikeouts in the 2000s",
    stats: "byDateRange",
    group: "pitching",
    sortStat: "strikeOuts",
    startDate: "2000-01-01",
    endDate: "2009-12-31"
  },

  {
    title: "Most Home Runs in 2025",
    stats: "season",
    group: "hitting",
    sortStat: "homeRuns",
    season: 2025
  }
];

function getDailyGame() {
  const dayNumber = getEasternDayNumber();

  const index = dayNumber % GAMES.length;

  return GAMES[index];
}

function loadGame() {
  const saved = localStorage.getItem("mlb-guesses");

  if (saved) {
    guesses = JSON.parse(saved);
  }
}


const GAME = getDailyGame();

let leaderboard = [];
let guesses = [];
let matches = [];
let activeIndex = -1;
let searchTimeout = null;


async function loadLeaderboard() {

  let url =
    `https://statsapi.mlb.com/api/v1/stats?` +
    `stats=${GAME.stats}` +
    `&group=${GAME.group}` +
    `&sportId=1` +
    `&sortStat=${GAME.sortStat}` +
    `&order=desc` +
    `&limit=1000`;

  if (GAME.startDate) {
    url += `&startDate=${GAME.startDate}`;
  }

  if (GAME.endDate) {
    url += `&endDate=${GAME.endDate}`;
  }

  if (GAME.season) {
    url += `&season=${GAME.season}`;
  }

  if (GAME.stats === "byDateRange") {
    url += `&playerPool=all`;
  }

  const res = await fetch(url);
  const data = await res.json();

  const leaders = data.stats?.[0]?.splits || [];

  leaderboard = leaders.map((p, i) => ({
    rank: i + 1,
    name: p.player.fullName,
    value: Number(p.stat[GAME.sortStat] || 0)
  }));
    
  gameTitle.textContent = GAME.title;

  render();
  lastGuess.innerHTML = "";
  guessCounter.textContent = `Guesses: ${guesses.length}`;

  
  checkWin();
}

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
      .map(p => p.fullName)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 8);

  } catch (e) {
    matches = [];
  }

  activeIndex = -1;
  renderDropdown();
}

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

  matches.forEach((name, index) => {
    const div = document.createElement("div");
    div.className = "item";

    if (index === activeIndex) div.classList.add("active");

    div.textContent = name;

    div.onclick = () => {
      input.value = name;
      dropdown.style.display = "none";
      guessPlayer();
    };

    dropdown.appendChild(div);
  });

  dropdown.style.display = "block";
}

input.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    searchPlayers(input.value);
  }, 150);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".container")) {
    dropdown.style.display = "none";
  }
});

function guessPlayer() {
  const value = input.value.trim();
  if (!value) return;

  const normalized = value.toLowerCase();

  const already = guesses.some(g => g.name.toLowerCase() === normalized);

  if (already) {
    message.textContent = `Already guessed: ${value}`;
    input.value = "";
    dropdown.style.display = "none";
    lastGuess.innerHTML = "";
    return;
  }

  message.textContent = "";

  const player = leaderboard.find(p =>
    p.name.toLowerCase() === normalized
  );

  if (player) {
    guesses.unshift(player);
  } else {
    guesses.unshift({
      rank: null,
      name: value,
      value: "-"
    });
  }

  render();
  guessCounter.textContent = `Guesses: ${guesses.length}`;

  checkWin();
  renderLastGuess();

  input.value = "";
  dropdown.style.display = "none";
  saveGame();
}

function renderLastGuess() {
  lastGuess.innerHTML = "";

  if (!guesses.length) return;

  const g = guesses[0];

  const div = document.createElement("div");

  const rankClass =
    typeof g.rank === "number"
      ? getColorClass(g.rank)
      : "other";

  div.className = `rowGuess ${rankClass}`;

  div.innerHTML = `
    <div class="rank">${g.rank ?? "-"}</div>
    <div class="name">${g.name}</div>
    <div class="value">${g.value}</div>
  `;

  lastGuess.appendChild(div);
}

function render() {
  board.innerHTML = "";

  const sorted = [...guesses].sort((a, b) => {
    if (a.rank === null) return 1;
    if (b.rank === null) return -1;
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
      input.value = matches[activeIndex];
      guessPlayer();
      return;
    }

    const typed = input.value.trim().toLowerCase();

    const isValid = matches.some(
      m => m.toLowerCase() === typed
    );

    if (!isValid) {
      message.textContent = "Select a player from the list";
      return;
    }

    guessPlayer();
  }
});

function checkWin() {
  const topFiveNames = leaderboard
    .filter(p => p.rank <= 5)
    .map(p => p.name.toLowerCase());

  const guessedNames = guesses.map(g => g.name.toLowerCase());

  if (topFiveNames.every(name => guessedNames.includes(name))) {
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


function saveGame() {
  localStorage.setItem("mlb-guesses", JSON.stringify(guesses));
}

function resetIfNewGame() {
  const currentGameId = getEasternDayNumber() % GAMES.length;

  const savedGameId = localStorage.getItem("mlb-game-id");

  if (savedGameId != currentGameId) {
    localStorage.setItem("mlb-game-id", currentGameId);

    localStorage.removeItem("mlb-guesses");
    localStorage.removeItem("mlb-win");

    guesses = [];
  }
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

resetIfNewGame();
loadGame();
loadLeaderboard();