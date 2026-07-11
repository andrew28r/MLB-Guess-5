const supabaseUrl = "https://aqnlbvlfkkhqewvdcehu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbmxidmxma2tocWV3dmRjZWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMDA4NTYsImV4cCI6MjA5ODg3Njg1Nn0.9Kw8ESBCDQGzqcg5lQnrl06DUr7-T7Ag8mmm2PzdWYI";


const supabaseClient = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);


window.playerDatabase = async function () {
  const playerId = localStorage.getItem("playerId");

  if (!playerId) {
    console.log("No player ID found");
    return;
  }

  const { data, error } = await supabaseClient
    .from("playerData")
    .select("*")
    .eq("playerId", playerId);

  if (error) {
    console.log(error);
    return;
  }

  console.log(data);
};
async function createPlayer(playerId) {

  // Check if player already exists
  const { data: existingPlayer, error: checkError } = await supabaseClient
    .from("playerData")
    .select("*")
    .eq("playerId", playerId)
    .maybeSingle();

  if (checkError) {
    console.log(checkError);
    return;
  }

  // Player already exists
  if (existingPlayer) {
    console.log("Existing player found:", existingPlayer);
    return existingPlayer;
  }


  // Create new player
  const { data, error } = await supabaseClient
    .from("playerData")
    .insert([
      {
        playerId: playerId,
        gamesPlayed: "0",
        wins: "0",
        streak: "0"
      }
    ])
    .select()
    .single();

  if (error) {
    console.log(error);
    return;
  }

  console.log("New player created:", data);

  return data;
}

window.playerGames = async function (date) {
  const playerId = localStorage.getItem("playerId");

  if (!playerId) return null;

  const { data, error } = await supabaseClient
    .from("playerGames")
    .select("*")
    .eq("playerId", playerId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};



const playBtn = document.getElementById("playBtn");

playBtn.addEventListener("click", () => {
  const today = formatLocalDate(new Date());
  window.location.href = `game.html?date=${today}`;
});

async function loadDayButtons() {
  const container = document.getElementById("dayButtons");
  container.innerHTML = "";

  const playerId = localStorage.getItem("playerId");
  if (!playerId) return;

  // Get recent dates
  const dates = [];

  const today = new Date();

  for (let i = 4; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    dates.push(formatLocalDate(date));
  }


  // Get all games at once
  const { data: games, error } = await supabaseClient
    .from("playerGames")
    .select("*")
    .eq("playerId", playerId)
    .in("date", dates);


  if (error) {
    console.error(error);
    return;
  }


  // Create buttons
  dates.forEach((iso) => {

    const date = new Date(iso + "T00:00:00");

    const month = date.getMonth() + 1;
    const day = date.getDate();

    const btn = document.createElement("button");

    btn.classList.add("day-btn");
    btn.textContent = `${month}/${day}`;
    btn.dataset.date = iso;


    btn.addEventListener("click", () => {
      window.location.href = `game.html?date=${iso}`;
    });


    const game = games.find(g => g.date === iso);

    if (!game) {
      // No game played
      btn.classList.add("notStarted");
    }
    else if (game.win === "true") {
      // Won
      btn.classList.add("completed");
    }
    else if (game.completed === "true") {
      // Gave up / failed
      btn.classList.add("failed");
    }
    else {
      // Has guesses but not finished
      btn.classList.add("incomplete");
    }


    container.appendChild(btn);

  });
}

document.addEventListener("DOMContentLoaded", loadDayButtons);

function openPopup() {
  const popup = document.getElementById("playerIdPopup");
  const input = document.getElementById("username");

  const playerId = localStorage.getItem("playerId");

  if (playerId) {
    input.value = playerId;
    popup.dataset.canClose = "true";
  } else {
    input.value = "";
    popup.dataset.canClose = "false";
  }

  popup.style.display = "flex";
}

function closePopup() {
  const popup = document.getElementById("playerIdPopup");

  if (popup.dataset.canClose !== "true") return;

  popup.style.display = "none";
}
const popup = document.getElementById("playerIdPopup");

popup.addEventListener("click", (e) => {
  if (e.target === popup) {
    closePopup();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closePopup();
  }
});
async function submitPlayerId() {
  const username = document.getElementById("username").value.trim();

  if (!username) return;


  const { data: existingPlayer } = await supabaseClient
    .from("playerData")
    .select("*")
    .eq("playerId", username)
    .maybeSingle();


  if (existingPlayer) {

    document.getElementById("loginConfirmText").textContent =
      `The player ID "${username}" already exists. Do you want to login to this account?`;

    document.getElementById("loginConfirmPopup").style.display = "flex";


    document.getElementById("loginYesBtn").onclick = () => {
      localStorage.setItem("playerId", username);

      document.getElementById("loginConfirmPopup").style.display = "none";
      document.getElementById("playerIdPopup").style.display = "none";

      loadDayButtons();
      loadPlayerStreak();
    };


    document.getElementById("loginNoBtn").onclick = () => {
      document.getElementById("loginConfirmPopup").style.display = "none";
    };


    return;
  }


  // New player
  await createPlayer(username);

  localStorage.setItem("playerId", username);

  document.getElementById("playerIdPopup").style.display = "none";

  loadDayButtons();
}

const localPlayerId = localStorage.getItem("playerId");
playerDatabase();

if (!localPlayerId) {
  openPopup();
}

console.log("Current player ID:", localPlayerId);

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function loadPlayerStreak() {
  const playerId = localStorage.getItem("playerId");

  if (!playerId) {
    document.getElementById("streakDisplay").textContent =
      "Current Streak: Login to view 🔥";
    return;
  }

  const { data, error } = await supabaseClient
    .from("playerData")
    .select("streak")
    .eq("playerId", playerId)
    .single();

  if (error) {
    console.error("Error loading streak:", error);
    return;
  }

  const streakDisplay = document.getElementById("streakDisplay");

  streakDisplay.textContent = Number(data.streak) > 0
    ? `Current Streak: ${data.streak} 🔥`
    : "";
}


async function loadLeaderboard() {

  const { data, error } = await supabaseClient
    .from("playerData")
    .select("playerId, wins")
    .order("wins", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Leaderboard error:", error);
    document.getElementById("leaderboardList").textContent =
      "Unable to load leaderboard";
    return;
  }

  const leaderboard = document.getElementById("leaderboardList");

  leaderboard.innerHTML = "";

  data.forEach((player, index) => {

    const row = document.createElement("div");

    row.className = "leaderboard-row";

    row.innerHTML = `
      <span>${index + 1}.</span>
      <span>${player.playerId}</span>
      <span>${player.wins}</span>
    `;

    leaderboard.appendChild(row);

  });
}


async function updateGamesPlayed(playerId) {
  // Get all games newest -> oldest
  const { data: games, error: gamesError } = await supabaseClient
    .from("playerGames")
    .select("*")
    .eq("playerId", playerId)
    .order("date", { ascending: false });

  if (gamesError) {
    console.error(gamesError);
    return;
  }

  let gamesPlayed = games.length;
  let wins = 0;
  let streak = 0;

  // Count ALL wins
  for (const game of games) {
    if (game.win === true || game.win === "true") {
      wins++;
    }
  }

  // Count current streak (newest -> oldest)
  const today = new Date().toISOString().split("T")[0];

  for (const game of games) {
    const isWin = game.win === true || game.win === "true";
    const isCompleted = game.completed === true || game.completed === "true";
    const isGiveup = isCompleted && !isWin;

    const completedSameDay =
      game.completedSameDay === true || game.completedSameDay === "true";

    const gameDate = game.date; // expected format: YYYY-MM-DD

    // Giveups reset streak
    if (isGiveup) {
      break;
    }

    // Today's game:
    // Count only if it is a win, otherwise skip it
    if (gameDate === today) {
      if (isWin && completedSameDay) {
        streak++;
      }
      continue;
    }

    // Previous days count normally
    if (isWin && completedSameDay) {
      streak++;
    } else {
      break;
    }
  }

  // Update playerData
  const { error: updateError } = await supabaseClient
    .from("playerData")
    .update({
      gamesPlayed: String(gamesPlayed),
      wins: String(wins),
      streak: String(streak)
    })
    .eq("playerId", playerId);

  if (updateError) {
    console.error(updateError);
    return;
  }

  console.log(
    `Updated ${playerId}: ${gamesPlayed} games played, ${wins} wins, ${streak} streak`
  );
}


window.addEventListener("load", async () => {
  const playerId = localStorage.getItem("playerId");

  if (playerId) {
    await updateGamesPlayed(playerId);
  }

  loadPlayerStreak();
  loadLeaderboard();
});