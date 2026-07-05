const playBtn = document.getElementById("playBtn");

playBtn.addEventListener("click", () => {
  const today = new Date().toISOString().split("T")[0];
  window.location.href = `game.html?date=${today}`;
});

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dayButtons");

  const today = new Date();

  for (let i = 4; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);

    const iso = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const label = `${month}/${day}`;

    const btn = document.createElement("button");
    btn.classList.add("day-btn");
    btn.textContent = label;

    btn.dataset.date = iso;

    btn.addEventListener("click", () => {
      window.location.href = `game.html?date=${iso}`;
    });


    const outcomeKey = `mlb_outcome_${iso}`;
    const outcome = localStorage.getItem(outcomeKey);

    if (outcome === "win") {
      btn.classList.add("completed"); // green
    } else if (outcome === "giveup") {
      btn.classList.add("failed"); // red
    } else {
      btn.classList.add("incomplete");
    }

    container.appendChild(btn);
  }
});
