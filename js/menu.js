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

    const savedKey = `mlb_completed_${iso}`;
    const isCompleted = localStorage.getItem(savedKey) === "true";

    btn.addEventListener("click", () => {
      window.location.href = `game.html?date=${iso}`;
    });

    if (isCompleted) {
      btn.classList.add("completed");
    } else {
      btn.classList.add("incomplete");
    }

    container.appendChild(btn);
  }
});
