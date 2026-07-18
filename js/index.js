window.playerDatabase = async function () {
  const playerId = localStorage.getItem("playerId");

  if (!playerId) {
    console.log("No player ID found");
    return;
  }

  const { data, error } = await db
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
  const { data: existingPlayer, error: checkError } = await db
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
  const { data, error } = await db
    .from("playerData")
    .insert([
      {
        playerId: playerId,
        gamesPlayed: 0,
        wins: 0,
        streak: 0
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


const playBtn = document.getElementById("playBtn");

playBtn.addEventListener("click", () => {
  const today = getEasternDateString();
  window.location.href = `game.html?date=${today}`;
});

async function loadDayButtons() {
  const container = document.getElementById("dayButtons");
  container.innerHTML = "";

  const playerId = localStorage.getItem("playerId");
  if (!playerId) return;

  // Get recent dates
  const dates = [];

  const today = new Date(
    new Date().toLocaleString(
      "en-US",
      {
        timeZone:"America/New_York"
      }
    )
  );

  for (let i = 4; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    dates.push(formatLocalDate(date));
  }


  // Get all games at once
  const { data: games, error } = await db
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


  const { data: existingPlayer } = await db
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

  const { data, error } = await db
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

  const { data, error } = await db
    .from("playerData")
    .select("playerId, wins")
    .neq("playerId", "andrew28r")
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

const calendarButton = document.getElementById("calendarButton");
const calendarPopup = document.getElementById("calendarPopup");
const closeCalendar = document.getElementById("closeCalendar");


closeCalendar.addEventListener("click", () => {
    calendarPopup.style.display = "none";
});
calendarPopup.addEventListener("click", (e) => {

    // Only close if clicking the dark overlay, not the calendar box
    if (e.target === calendarPopup) {
        calendarPopup.style.display = "none";
    }

});

calendarButton.addEventListener("click", async () => {
    calendarPopup.style.display = "flex";
    setCurrentCalendarMonth();
    await loadCalendar();
});

let calendarYear;
let calendarMonth;

function setCurrentCalendarMonth() {

    const today = new Date(
        new Date().toLocaleString("en-US", {
            timeZone:"America/New_York"
        })
    );

    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth();

}
const minCalendarYear = 2026;
const minCalendarMonth = 6; // July

async function loadCalendar() {

    const grid = document.getElementById("calendarGrid");

    grid.innerHTML = "";


    const year = calendarYear;
    const month = calendarMonth;


    document.getElementById("calendarMonth").textContent =
        new Date(year, month).toLocaleString("default", {
            month: "long",
            year: "numeric"
        });


    // Day headers
    const headers = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
    ];


    headers.forEach(day => {

        const header = document.createElement("div");

        header.className = "calendar-header-day";

        header.textContent = day;

        grid.appendChild(header);

    });



    // Empty spaces before first day
    const firstDay = new Date(year, month, 1).getDay();


    for (let i = 0; i < firstDay; i++) {

        grid.appendChild(document.createElement("div"));

    }



    const playerId = localStorage.getItem("playerId");


    const { data: games, error } = await db
        .from("playerGames")
        .select("*")
        .eq("playerId", playerId);


    if (error) {

        console.error(error);

        return;

    }



    const today = new Date(
        new Date().toLocaleString("en-US", {
            timeZone:"America/New_York"
        })
    );



    // Days in month
    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();



    for (let day = 1; day <= daysInMonth; day++) {


        const square = document.createElement("div");

        square.className = "calendarDay";

        square.textContent = day;



        const monthNumber = String(month + 1).padStart(2, "0");

        const dayNumber = String(day).padStart(2, "0");


        const dateString =
            `${year}-${monthNumber}-${dayNumber}`;


        square.dataset.date = dateString;



        const calendarDate =
            new Date(dateString + "T00:00:00");



        const game =
            games.find(g => g.date === dateString);



        // Future game
        if (calendarDate > today) {

            square.classList.add("future");

        }


        // Won
        else if (game && game.win === "true") {

            square.classList.add("completed");

        }


        // Failed
        else if (game && game.completed === "true") {

            square.classList.add("failed");

        }


        // Started but unfinished
        else if (game) {

            square.classList.add("incomplete");

        }


        // Available past game
        else {

            square.classList.add("notStarted");

        }



        // Open game when clicked
        square.addEventListener("click", () => {


            if (calendarDate > today) {

                return;

            }


            window.location.href =
                `game.html?date=${dateString}`;


        });



        grid.appendChild(square);

    }

}





const prevMonth =
    document.getElementById("prevMonth");


const nextMonth =
    document.getElementById("nextMonth");



prevMonth.addEventListener("click", async () => {

    calendarMonth--;

    if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
    }


    // Stop going before July 2026
    if (
        calendarYear < minCalendarYear ||
        (calendarYear === minCalendarYear && calendarMonth < minCalendarMonth)
    ) {

        calendarYear = minCalendarYear;
        calendarMonth = minCalendarMonth;

        return;
    }


    await loadCalendar();

});





nextMonth.addEventListener("click", async () => {


    calendarMonth++;


    if (calendarMonth > 11) {

        calendarMonth = 0;

        calendarYear++;

    }


    await loadCalendar();


});


window.addEventListener("load", async () => {
  const playerId = localStorage.getItem("playerId");

  if (playerId) {
    await updateGamesPlayed(playerId);
  }

  loadPlayerStreak();
  loadLeaderboard();
});