let selectedDate = getSelectedDate();

const [year, month, day] = selectedDate.split("-");
document.getElementById("gameDate").textContent = `${month}/${day}/${year}`;

/*const [year, month, day] = selectedDate.split("-");

document.getElementById("gameDate").textContent =
  `${Number(month)}/${Number(day)}/${year}`;*/

let gameInfoObj;

let playerGame;
let statusGameWin = "false";
let statusGameCompleted = "false";
let statusCompletedSameDay = "false";

const today = getEasternDateString();
if (selectedDate > today) {
    window.location.href = "index.html";
}


async function loadPlayerGame() {
  playerGame = await playerGames(selectedDate);

  if (playerGame) {

    guesses = playerGame.guesses
      ? JSON.parse(playerGame.guesses)
      : [];

    statusGameWin = playerGame.win || "false";
    statusGameCompleted = playerGame.completed || "false";
    statusCompletedSameDay = playerGame.completedSameDay || "false";
    totalHintClicks = Number(playerGame.hintClicks || 0);

  } else {

    guesses = [];
    statusGameWin = "false";
    statusGameCompleted = "false";

  }

  if (statusGameCompleted === "true") {
    gameLocked = true;
    applyLockUI();
  }

  console.log("Loaded guesses:", guesses);
}

window.addPlayerGame = async function (
  date,
  guesses = "",
  guessesNumber = "0",
  win = "",
  completed = "",
  completedSameDay = "",
  hintClicks = "0"
) {
  const playerId = getPlayerId();
  if (!playerId) return null;

  const { data, error } = await db
    .from("playerGames")
    .upsert({
        playerId,
        date,
        guesses,
        guessesNumber,
        win,
        completed,
        completedSameDay,
        hintClicks
    }, {
        onConflict: "playerId,date"
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};


window.updatePlayerGame = async function (
  date,
  guesses,
  guessesNumber,
  win,
  completed,
  completedSameDay
) {
  const playerId = getPlayerId();
  if (!playerId) return null;

  const { data, error } = await db
    .from("playerGames")
    .update({
      guesses,
      guessesNumber,
      win,
      completed,
      completedSameDay
    })
    .eq("playerId", playerId)
    .eq("date", date)
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};


window.insertData = async function () {
  const gameObj = getGameForDate(selectedDate);

  const { error } = await db
    .from("games")
    .upsert([
      {
        date: selectedDate,
        gameinfo: gameObj
      }
    ], { onConflict: "date" });

  document.getElementById("output").textContent =
    error ? error.message : "Game created!";
};

window.checkData = async function (getAll = false) {

    let query = db.from("games").select("*");

    if (!getAll) {
        query = query.eq("date", selectedDate).maybeSingle();
    }

    const { data, error } = await query;

    if (error) {
        document.getElementById("output").textContent = error.message;
        return null;
    }

    document.getElementById("output").textContent =
        JSON.stringify(data, null, 2);

    return data;
};


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
let hintClickCount = 0;
let totalHintClicks = 0;

let GAME;



/* =========================
   CONFIG
========================= */
const TEAMS = [
  { id: 109, name: "Arizona Diamondbacks" },
  { id: 144, name: "Atlanta Braves" },
  { id: 147, name: "New York Yankees" },
  { id: 110, name: "Baltimore Orioles" },
  { id: 111, name: "Boston Red Sox" },
  { id: 112, name: "Chicago Cubs" },
  { id: 145, name: "Chicago White Sox" },
  { id: 113, name: "Cincinnati Reds" },
  { id: 114, name: "Cleveland Guardians" },
  { id: 115, name: "Colorado Rockies" },
  { id: 116, name: "Detroit Tigers" },
  { id: 117, name: "Houston Astros" },
  { id: 118, name: "Kansas City Royals" },
  { id: 108, name: "Los Angeles Angels" },
  { id: 119, name: "Los Angeles Dodgers" },
  { id: 158, name: "Milwaukee Brewers" },
  { id: 142, name: "Minnesota Twins" },
  { id: 121, name: "New York Mets" },
  { id: 133, name: "Oakland Athletics" },
  { id: 143, name: "Philadelphia Phillies" },
  { id: 134, name: "Pittsburgh Pirates" },
  { id: 135, name: "San Diego Padres" },
  { id: 137, name: "San Francisco Giants" },
  { id: 136, name: "Seattle Mariners" },
  { id: 138, name: "St. Louis Cardinals" },
  { id: 139, name: "Tampa Bay Rays" },
  { id: 140, name: "Texas Rangers" },
  { id: 141, name: "Toronto Blue Jays" },
  { id: 120, name: "Washington Nationals" }
];

const STATS = [
  { stat: "homeRuns", title: "Home Runs", group: "hitting", includeTeamSeason: true },
  { stat: "triples", title: "Triples", group: "hitting", includeTeamSeason: false },
  { stat: "doubles", title: "Doubles", group: "hitting", includeTeamSeason: false },
  { stat: "hits", title: "Hits", group: "hitting", includeTeamSeason: false },
  { stat: "walks", title: "Walks", group: "hitting", includeTeamSeason: false },
  { stat: "rbi", title: "RBI", group: "hitting", includeTeamSeason: false },
  { stat: "stolenBases", title: "Stolen Bases", group: "hitting", includeTeamSeason: false },

  { stat: "wins", title: "Wins", group: "pitching", includeTeamSeason: false },
  { stat: "strikeOuts", title: "Strikeouts", group: "pitching", includeTeamSeason: false },
  { stat: "saves", title: "Saves", group: "pitching", includeTeamSeason: false }
];

const YEARS = [
  1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 
  2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
  2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 
  2020, 2021, 2022, 2023, 2024, 2025
];

const DECADES = [1970, 1980, 1990, 2000, 2010, 2020];


function getGameSignature(game) {
  return JSON.stringify({
    group: game.group,
    sortStat: game.sortStat,
    stats: game.stats,
    season: game.season || null,
    teamId: game.teamId || null,
    startDate: game.startDate || null,
    endDate: game.endDate || null,
    gameType: game.gameType || "R",
  });
}



/* =========================
   SEED SYSTEM
========================= */

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
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


/* =========================
   STATE
========================= */

let leaderboard = [];
let guesses = [];
let matches = [];
let activeIndex = -1;
let searchTimeout = null;



/* =========================
   STORAGE
========================= */

function getSelectedDate() {
  const params = new URLSearchParams(window.location.search);
  const urlDate = params.get("date");

  if (urlDate) return urlDate;

  return getEasternDateString();
}

async function saveGame() {

  console.log("statusGameCompleted:", statusGameCompleted);
  console.log("selectedDate:", selectedDate);
  console.log("today:", getEasternDateString());

  const gameData = {
    guesses: JSON.stringify(guesses),
    guessesNumber: String(guesses.length),
    win: String(statusGameWin),
    completed: String(statusGameCompleted),
    completedSameDay:
      statusGameCompleted === "true" &&
      selectedDate === getEasternDateString()
        ? "true"
        : "false",
    hintClicks: String(totalHintClicks)
  };

  playerGame = await addPlayerGame(
    selectedDate,
    gameData.guesses,
    gameData.guessesNumber,
    gameData.win,
    gameData.completed,
    gameData.completedSameDay,
    gameData.hintClicks
  );

  await updateGamesPlayed(getPlayerId());
  console.log("Game Saved.");
}

/* =========================
   RESET DAILY GAME
========================= */


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

async function loadLeaderboard(){

  leaderboard =
    await fetchLeaderboard(gameInfoObj);


  gameTitle.textContent =
    gameInfoObj.title;


  renderStatHeader();

  render();

  lastGuess.innerHTML="";


  document.getElementById(
    "guessNumber"
  ).textContent = guesses.length;


  if(leaderboard.length)
    checkWin();

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
      hintClickCount = 0;

      setHintStage(0);
      clearHintData();
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
  document.getElementById("guessNumber").textContent = guesses.length;

  await checkWin();
  renderLastGuess();

  input.value = "";
  dropdown.style.display = "none";
  
  await saveGame();
}

async function checkWin() {
  // Game already finished
  if (gameLocked || statusGameCompleted === "true") return;

  // Cannot possibly win before 5 guesses
  if (guesses.length < 5) return;

  const topFive = leaderboard
    .filter(p => p.rank <= 5)
    .map(p => p.name.toLowerCase());

  // Leaderboard is invalid
  if (topFive.length !== 5) return;

  const guessed = guesses.map(g => g.name.toLowerCase());

  // Must have exactly the 5 unique Top 5 players
  const guessedTopFive = [...new Set(
    guessed.filter(name => topFive.includes(name))
  )];

  if (guessedTopFive.length !== 5) return;

  // WIN
  gameOutcome = "win";
  statusGameWin = "true";
  statusGameCompleted = "true";
  gameLocked = true;

  clearHintData();

  await saveGame();


  stopAutoSave();

  applyLockUI();
  openPopup();
}


function closePopup() {
  document.getElementById("winPopup").style.display = "none";
}


function shareResults() {
  const { green, yellow, red, gray } = getGuessStats();
  const [year, month, day] = selectedDate.split("-");
  const displayDate = `${month}/${day}/${year}`;

  const outcomeText =
    gameOutcome === "giveup"
      ? "Gave Up ❌"
      : "Solved ✅";

  const text =
`Daily Diamond 5 - ${displayDate}

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

  const { green, yellow, red, gray } = getGuessStats();

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

  popup.style.display = "block";
}

async function openGiveUpPopup() {
  const popup = document.getElementById("winPopup");
  const title = document.getElementById("winTitle");
  const scoreStats = document.getElementById("scoreStats");

  gameOutcome = "giveup";
  title.textContent = "You Gave Up!";

  statusGameWin = "false";
  statusGameCompleted = "true";
  gameLocked = true;

  clearHintData();

  await saveGame(); // <-- ADD THIS

  
  stopAutoSave();
  applyLockUI();

  const { green, yellow, red, gray } = getGuessStats();

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

  popup.style.display = "block";
}




function getGameFromSeed(seed) {
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const r3 = seededRandom(seed + 2);
  const r4 = seededRandom(seed + 3);
  const r5 = seededRandom(seed + 4);

  const isTeamGame = r1 < 0.35;

  const team = isTeamGame
    ? TEAMS[Math.floor(r2 * TEAMS.length)]
    : null;

  let availableStats = STATS;

  if (isTeamGame) {
    availableStats = STATS.filter(s => s.includeTeamSeason !== false);
  }

  const stat = availableStats[Math.floor(r3 * availableStats.length)];

  let game = {
    group: stat.group,
    sortStat: stat.stat
  };

  if (isTeamGame) {
    game.teamId = team.id;
    game.teamName = team.name;
  }

  if (r4 < 0.33) {
    game.stats = "career";
    game.title = isTeamGame
      ? `Most Career ${stat.title} for ${team.name}`
      : `Most Career ${stat.title}`;
  } else if (r4 < 0.66) {
    const year = YEARS[Math.floor(r5 * YEARS.length)];

    game.stats = "season";
    game.season = year;

    game.title = isTeamGame
      ? `Most ${stat.title} in ${year} for ${team.name}`
      : `Most ${stat.title} in ${year}`;
  } else {
    const decade = DECADES[Math.floor(r5 * DECADES.length)];

    game.stats = "byDateRange";
    game.startDate = `${decade}-01-01`;
    game.endDate = `${decade + 9}-12-31`;

    game.title = isTeamGame
      ? `Most ${stat.title} in the ${decade}s for ${team.name}`
      : `Most ${stat.title} in the ${decade}s`;
  }

  return game;
}

function getGameForDate(dateString) {
  return getGameFromSeed(getEasternDayNumberFromDate(dateString));
}

async function generateUniqueGame(dateString) {

  const baseSeed = Math.floor(Math.random() * 1000000000);

  const { data, error } = await db
    .from("games")
    .select("gameinfo");

  if (error) throw error;

  const used = new Set();

  data.forEach(row => {
    const game =
      typeof row.gameinfo === "string"
        ? JSON.parse(row.gameinfo)
        : row.gameinfo;

    used.add(getGameSignature(game));
  });

  let offset = 0;

  while (offset < 1000) {
    const game = getGameFromSeed(baseSeed + offset);

    if (!used.has(getGameSignature(game))) {
      return game;
    }

    offset++;
  }

  throw new Error("Could not generate unique game.");
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
document.getElementById("testGameBtn").addEventListener("click", () => {
  console.log("BUTTON CLICKED");

  const [year, month, day] = selectedDate.split("-").map(Number);

  const base = new Date(
    `${selectedDate}T12:00:00`
  );

  base.setDate(base.getDate() + 1);

  const nextDate = formatLocalDate(base);

  console.log("Current page date:", selectedDate);
  console.log("Next date:", nextDate);

  window.location.href = `game.html?date=${nextDate}`;
});

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getPlayerId() {
    return localStorage.getItem("playerId");
}

document.getElementById("backBtn").onclick = () => {
    window.location.href = "index.html";
};

document.getElementById("menuBtn").onclick = () => {
    menu.classList.toggle("hidden");
};

document.getElementById("hintBtn").addEventListener("click", async () => {
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
    setHintPlayer(player);

    hintClickCount++;
    totalHintClicks++;

    await saveGame();

    setHintStage(hintClickCount);

    const initials = player.name
        .split(" ")
        .map(n => n[0])
        .join(".") + ".";

    const isTeamGame = !!GAME.teamId;
    const isAllStarGame = GAME.gameType === "A";

    const league = player.league || "";
    const team = player.team || "";
    const position = player.position || "";

    if (isTeamGame) {
        // TEAM GAME
        if (hintClickCount === 1) {
            hint.textContent = `Hint: ${position}`;
        } 
        else if (hintClickCount === 2) {
            hint.textContent = `Hint: ${position} | ${initials}`;
        } 
        else if (hintClickCount === 3) {
            hint.textContent = "";

            input.value = player.name;

            setTimeout(() => {
                guessPlayer();
            }, 100);

            hintClickCount = 0;
        }
    } 
    else if (isAllStarGame) {
        // ALL-STAR GAME
        if (hintClickCount === 1) {
            hint.textContent = `Hint: ${league}`;
        } 
        else if (hintClickCount === 2) {
            hint.textContent = `Hint: ${league} | ${position}`;
        } 
        else if (hintClickCount === 3) {
            hint.textContent = `Hint: ${league} | ${position} | ${initials}`;
        } 
        else if (hintClickCount === 4) {
            hint.textContent = "";

            input.value = player.name;

            setTimeout(() => {
                guessPlayer();
            }, 100);

            hintClickCount = 0;
        }
    } 
    else {
        // NORMAL NON-TEAM GAME
        if (hintClickCount === 1) {
            hint.textContent = `Hint: ${league}`;
        } 
        else if (hintClickCount === 2) {
            hint.textContent = `Hint: ${league} | ${team}`;
        } 
        else if (hintClickCount === 3) {
            hint.textContent = `Hint: ${league} | ${team} | ${position}`;
        } 
        else if (hintClickCount === 4) {
            hint.textContent = `Hint: ${league} | ${team} | ${position} | ${initials}`;
        } 
        else if (hintClickCount === 5) {
            hint.textContent = "";

            input.value = player.name;

            setTimeout(() => {
                guessPlayer();
            }, 100);

            hintClickCount = 0;
        }
    }

    menu.classList.add("hidden");
});


document.addEventListener("click", (e) => {
  if (!e.target.closest(".container")) {
    dropdown.style.display = "none";
  }
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
    searchPlayers(input.value)
    .then(results=>{
        matches = results;
        activeIndex=-1;
        renderDropdown();
    });
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
  //document.getElementById("winPopup").style.display = "none";

  const popup = document.getElementById("leaderboardPopup");
  const list = document.getElementById("leaderboardList");

  // sort leaderboard (safely)
  const sorted = [...leaderboard].sort((a, b) => {
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  });

  list.innerHTML = "";

  document.getElementById("leaderboardTitle").textContent =
  gameInfoObj.title;

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





function applyLockUI() {
  if (gameLocked) {
    input.disabled = true;
    input.placeholder = "Game finished";
  }
}
function getEasternDateString() {
  const eastern = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York"
    })
  );

  const year = eastern.getFullYear();
  const month = String(eastern.getMonth() + 1).padStart(2, "0");
  const day = String(eastern.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getGuessStats() {
    return guesses.reduce((stats, g) => {
        if (typeof g.rank !== "number") {
            stats.gray++;
        } else if (g.rank <= 5) {
            stats.green++;
        } else if (g.rank <= 10) {
            stats.yellow++;
        } else if (g.rank <= 25) {
            stats.red++;
        } else {
            stats.gray++;
        }

        return stats;
    }, {
        green: 0,
        yellow: 0,
        red: 0,
        gray: 0
    });
}

function getHintStageKey() {
  return `hintStage_${selectedDate}`;
}

function getHintStage() {
  return Number(localStorage.getItem(getHintStageKey()) || 0);
  
}

function setHintStage(value) {
  localStorage.setItem(getHintStageKey(), value);
}

function loadHintStage() {
    const stage = getHintStage();

    if (!stage) return;

    hintedPlayer = getHintPlayer();

    if (!hintedPlayer) return;

    const player = hintedPlayer;

    const initials = player.name
        .split(" ")
        .map(n => n[0])
        .join(".") + ".";

    const league = player.league || "";
    const team = player.team || "";
    const position = player.position || "";

    const isTeamGame = !!GAME.teamId;
    const isAllStarGame = GAME.gameType === "A";

    if (stage === 1) {
        if (isTeamGame) {
            hint.textContent = `Hint: ${position}`;
        } else {
            hint.textContent = `Hint: ${league}`;
        }
    } 
    else if (stage === 2) {
        if (isTeamGame) {
            hint.textContent = `Hint: ${position} | ${initials}`;
        } else if (isAllStarGame) {
            hint.textContent = `Hint: ${league} | ${position}`;
        } else {
            hint.textContent = `Hint: ${league} | ${team}`;
        }
    }
}

function getHintPlayerKey() {
  return `hintPlayer_${selectedDate}`;
}

function setHintPlayer(player) {
  localStorage.setItem(
    getHintPlayerKey(),
    JSON.stringify(player)
  );
}

function getHintPlayer() {
  const saved = localStorage.getItem(getHintPlayerKey());

  return saved ? JSON.parse(saved) : null;
}

function clearHintPlayer() {
  localStorage.removeItem(getHintPlayerKey());
}

function clearHintData() {
  localStorage.removeItem(getHintStageKey());
  localStorage.removeItem(getHintPlayerKey());

  hintedPlayer = null;
  hintClickCount = 0;
  hint.textContent = "";
}


/* =========================
   INIT
========================= */
(async function boot() {
  try {
    console.log("Boot started");

    console.log("Checking today's game...");

    const { data: todaysGame, error } = await db
      .from("games")
      .select("gameinfo")
      .eq("date", selectedDate)
      .maybeSingle();

    if (error) throw error;

    if (todaysGame) {
      console.log("Loaded existing game.");

      gameInfoObj =
        typeof todaysGame.gameinfo === "string"
          ? JSON.parse(todaysGame.gameinfo)
          : todaysGame.gameinfo;

    } else {
      console.log("Generating new game...");

      const generatedGame = await generateUniqueGame(selectedDate);

      const { error: insertError } = await db
        .from("games")
        .upsert(
          {
            date: selectedDate,
            gameinfo: generatedGame
          },
          {
            onConflict: "date"
          }
        );

      if (insertError) throw insertError;

      gameInfoObj = generatedGame;
    }

    GAME = gameInfoObj;

    await loadPlayerGame();

    hintClickCount = getHintStage();

    await loadLeaderboard();  // <-- PUT IT RIGHT AFTER THIS


    // Restore completed game popup after reload
    if (statusGameCompleted === "true") {
      gameLocked = true;
      applyLockUI();

      if (statusGameWin === "true") {
        gameOutcome = "win";
        openPopup();
      } else {
        gameOutcome = "giveup";
        openGiveUpPopup();
      }
    }


    loadHintStage();

    startAutoSave();

    console.log("Boot finished");

  } catch (err) {
    console.error("BOOT FAILED:", err);

    gameTitle.textContent = "Failed to load today's game.";
    message.textContent = err.message;
  }
})();

let autoSaveInterval;

function startAutoSave() {
  autoSaveInterval = setInterval(() => {
    if (guesses.length > 0) {
      saveGame();
    }
  }, 10000);
}

function stopAutoSave() {
  clearInterval(autoSaveInterval);
}


function renderStatHeader() {

  const abbreviations = {
    homeRuns: "HR",
    triples: "3B",
    doubles: "2B",
    hits: "H",
    walks: "BB",
    rbi: "RBI",
    stolenBases: "SB",
    wins: "W",
    strikeOuts: "SO",
    saves: "SV",
    gamesPlayed: "G"
  };

  const abbr = abbreviations[gameInfoObj.sortStat] || "";

  const html = `
    <div></div>
    <div></div>
    <div class="stat-label">${abbr}</div>
  `;

  document.getElementById("statHeader").innerHTML = html;

  //document.getElementById("leaderboardStatHeader").innerHTML = html;
}