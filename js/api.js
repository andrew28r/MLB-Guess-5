const MLB_API = "https://statsapi.mlb.com/api/v1";


/* =========================
   PLAYER SEARCH
========================= */

async function searchPlayers(query) {

  const q = query.trim();

  if (q.length < 2) {
    return [];
  }


  try {

    const res = await fetch(
      `${MLB_API}/people/search?names=${encodeURIComponent(q)}`
    );

    const data = await res.json();


    return (data.people || [])
      .map(p => ({
        name: p.fullName,
        id: p.id
      }))
      .slice(0,8);


  } catch(err){

    console.error("Player search failed:", err);

    return [];
  }
}




/* =========================
   VALIDATE PLAYER
========================= */

async function validatePlayerName(name){

  const res = await fetch(
    `${MLB_API}/people/search?names=${encodeURIComponent(name)}`
  );


  const data = await res.json();


  const people = data.people || [];


  return people.find(
    p =>
      p.fullName.toLowerCase()
      === name.toLowerCase()

  ) || null;

}





/* =========================
   LEADERBOARD
========================= */

async function fetchLeaderboard(gameInfoObj){

  let url =
    `${MLB_API}/stats?` +
    `stats=${gameInfoObj.stats}` +
    `&group=${gameInfoObj.group}` +
    `&sportId=1` +
    `&sortStat=${gameInfoObj.sortStat}` +
    `&order=desc` +
    `&limit=1000`;


  if(gameInfoObj.startDate)
    url += `&startDate=${gameInfoObj.startDate}`;


  if(gameInfoObj.endDate)
    url += `&endDate=${gameInfoObj.endDate}`;


  if(gameInfoObj.season)
    url += `&season=${gameInfoObj.season}`;


  if(gameInfoObj.teamId)
    url += `&teamId=${gameInfoObj.teamId}`;


  if(gameInfoObj.gameType)
    url += `&gameType=${gameInfoObj.gameType}`;


  url += "&playerPool=all";


  console.log(url);


  const res = await fetch(url);


  if(!res.ok){
    throw new Error(
      `MLB API returned ${res.status}`
    );
  }


  const data = await res.json();


  const leaders =
    data.stats?.[0]?.splits || [];


  return leaders.map((p,i)=>({

    rank:i+1,

    name:p.player.fullName,

    value:Number(
      p.stat[gameInfoObj.sortStat] || 0
    ),

    team:p.team?.name || "Unknown",

    league: getLeagueAbbreviation(p.league?.name),

    position:p.position?.abbreviation || "N/A"

  }));

}

function getLeagueAbbreviation(league) {
  if (league === "National League") return "NL";
  if (league === "American League") return "AL";

  return league || "";
}


/* =========================
   HEADSHOT
========================= */

function getHeadshot(playerId){

  return (
    `https://img.mlbstatic.com/mlb/images/players/head_shot/${playerId}.jpg`
  );

}




// Make available everywhere

window.searchPlayers = searchPlayers;
window.validatePlayerName = validatePlayerName;
window.fetchLeaderboard = fetchLeaderboard;
window.getHeadshot = getHeadshot;