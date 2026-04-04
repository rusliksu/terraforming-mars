const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8082;
const API_KEY = "tm-elo-2024";
const ELO_FILE = path.join(__dirname, "elo-data.json");
const DEFAULT_ELO = 1500;
const K = 32;

// Name normalization (from fix_elo_dupes.py MERGES)
const MERGES = {
  "death": "Death", "death ": "Death",
  "death8": "Death8Killer", "death8killer": "Death8Killer", "deathkiller": "Death8Killer",
  "lfc": "LFC", "lfc ": "LFC",
  "gydro": "GydRo",
  "linda": "Linda", "linda ": "Linda",
  "giasa": "Giasa", "giasa_": "Giasa",
  "simon": "Simon",
  "geek": "GeekDumb", "geekdumb": "GeekDumb",
  "bmac": "BmacG", "bmacg": "BmacG", "bmacg.": "BmacG",
  "drr": "Drrrg", "drrg": "Drrrg", "drrrg": "Drrrg",
  "duc": "Duc Nguyen", "duc nguyen": "Duc Nguyen",
  "dukz": "Dukz01", "dukz01": "Dukz01",
  "mrf": "MrFahrenheit", "mrf ": "MrFahrenheit", "mrfahrenheit": "MrFahrenheit",
  " mrfahrenheit": "MrFahrenheit", "mrfahrenheit7": "MrFahrenheit", "fahren": "MrFahrenheit",
  "eket": "Eket", "eket678": "Eket",
  "masterkeys": "MasterKeys", "mstrkeys": "MasterKeys",
  "hoyla": "Hoyla",
  "iro": "Iropikc", "iropic": "Iropikc", "iropick": "Iropikc", "iropikc": "Iropikc",
  "jackir": "Jackir", "kamui": "Kamui",
  "lang": "Langfjes", "langfjes": "Langfjes",
  "low": "LOW615", "low615": "LOW615",
  "madhatta": "MadHatter", "madhatter": "MadHatter",
  "mon": "Monty", "mon00": "Monty", "monty": "Monty",
  "mort": "Mortaum", "moratum": "Mortaum", "mortarum": "Mortaum", "mortaum": "Mortaum",
  "mu6ra7a": "Mu6Ra7a", "mu6rata": "Mu6Ra7a",
  "nagimi": "Nagumi", "nagumi": "Nagumi",
  "nikoha": "Nikoha", "nihoka13": "Nikoha",
  "pa": "Pa2016", "pa2016": "Pa2016",
  "panda": "Panda", "pandaboi": "Panda",
  "plaz": "Plazmica", "plazma": "Plazmica", "plazmica": "Plazmica",
  "pop": "Popsickle", "popi": "Popsickle", "poppy": "Popsickle",
  "popsickle": "Popsickle", "popsickle ": "Popsickle", "popsicle": "Popsickle",
  "preparationfit": "PreparationFit", "prepartionfit": "PreparationFit",
  "reinforcement": "Reinforcement", "reinforcement-": "Reinforcement",
  "rianby": "Rianby", "s29jin": "S29jin",
  "shm": "Shmondar", "shmo": "Shmondar", "shmondar": "Shmondar",
  "tarun": "Tarun", "taru": "Tarun", "taruntheo13": "Tarun",
  "teddy": "Teddy",
  "underthegun": "UTG", "utg": "UTG",
  "vit": "VitalyVit", "vitaly": "VitalyVit", "vitalyvit": "VitalyVit",
  "vvb": "VvbMinsk", "vvbminsk": "VvbMinsk",
  "wd": "Wdkymyms", "wdk": "Wdkymyms", "wdkmysms": "Wdkymyms",
  "wdkumums": "Wdkymyms", "wdkym": "Wdkymyms", "wdkymymd": "Wdkymyms", "wdkymyms": "Wdkymyms",
  "kaera": "Kaera", "kaera02": "Kaera",
  "coolio": "Coolio", "xenon": "Xenon",
  "zalo": "Zalo", "zalobolivia": "Zalo",
  "krootish": "Krootish86", "krootish86": "Krootish86",
  "j1233": "J1234", "j1234": "J1234",
  "italian": "Italianood", "italianood": "Italianood", "ita": "Italianood",
  "cuc": "Cucumber", "cucumber": "Cucumber",
  "tal": "Talov", "talov": "Talov",
  "raj": "Rajatppn", "raja": "Rajatppn", "rajatppn": "Rajatppn",
  "mikiekv": "MikiEkv", "kuntiny": "Kuntiny",
  "amzo": "Amzo", "amzo4": "Amzo",
  "tacos": "Los Tacos", "los tacos": "Los Tacos",
  "andrewk": "Andrewk", "andrew": "Andrewk",
  "kogoro": "Kogoro", "tersius": "Tersius",
  "martian": "Martian", "junior": "Junior", "zara": "Zara",
};

function normalizeName(name) {
  var nk = (name || "").toLowerCase().trim();
  return MERGES[nk] || name.trim();
}

function expectedScore(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function placementScore(place, playerCount) {
  if (playerCount <= 1) return 1;
  return Math.max(0, Math.min(1, 1 - ((Math.max(1, place) - 1) / (playerCount - 1))));
}

function rebuildElo(data) {
  var eloPlace = {}, eloVP = {}, firsts = {}, placeScoreTotals = {}, gamesCount = {}, displayNames = {};
  var top3Counts = {}, totalVPs = {}, corpsByPlayer = {};

  for (var gi = 0; gi < data.games.length; gi++) {
    var g = data.games[gi];
    var results = g.results || [];
    var n = results.length;
    if (n < 2) continue;

    for (var ri = 0; ri < n; ri++) {
      var r = results[ri];
      var dn = r.displayName || r.name || "?";
      var canonical = normalizeName(dn);
      r.displayName = canonical;
      r.name = canonical.toLowerCase();
    }

    for (var ri = 0; ri < n; ri++) {
      var nk = results[ri].name;
      var place = results[ri].place || (ri + 1);
      var vp = results[ri].vp || 0;
      var corp = results[ri].corp || "";
      displayNames[nk] = results[ri].displayName;
      gamesCount[nk] = (gamesCount[nk] || 0) + 1;
      if (place === 1) firsts[nk] = (firsts[nk] || 0) + 1;
      if (place <= 3) top3Counts[nk] = (top3Counts[nk] || 0) + 1;
      placeScoreTotals[nk] = (placeScoreTotals[nk] || 0) + placementScore(place, n);
      totalVPs[nk] = (totalVPs[nk] || 0) + vp;
      if (!corpsByPlayer[nk]) corpsByPlayer[nk] = {};
      if (corp) corpsByPlayer[nk][corp] = (corpsByPlayer[nk][corp] || 0) + 1;
    }

    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var pi = results[i].name;
        var pj = results[j].name;
        var rpi = eloPlace[pi] || DEFAULT_ELO;
        var rpj = eloPlace[pj] || DEFAULT_ELO;
        var ei = expectedScore(rpi, rpj);
        var piPl = results[i].place || i + 1;
        var pjPl = results[j].place || j + 1;
        var si = piPl < pjPl ? 1.0 : piPl === pjPl ? 0.5 : 0.0;
        var k = K / Math.max(1, n - 1);
        eloPlace[pi] = (eloPlace[pi] || DEFAULT_ELO) + k * (si - ei);
        eloPlace[pj] = (eloPlace[pj] || DEFAULT_ELO) + k * ((1 - si) - (1 - ei));

        var vi = results[i].vp || 0;
        var vj = results[j].vp || 0;
        var rpi2 = eloVP[pi] || DEFAULT_ELO;
        var rpj2 = eloVP[pj] || DEFAULT_ELO;
        var ei2 = expectedScore(rpi2, rpj2);
        var si2 = vi > vj ? 1.0 : vi === vj ? 0.5 : 0.0;
        eloVP[pi] = (eloVP[pi] || DEFAULT_ELO) + k * (si2 - ei2);
        eloVP[pj] = (eloVP[pj] || DEFAULT_ELO) + k * ((1 - si2) - (1 - ei2));
      }
    }
  }

  var players = {};
  var keys = Object.keys(gamesCount);
  for (var ki = 0; ki < keys.length; ki++) {
    var nk = keys[ki];
    players[nk] = {
      displayName: displayNames[nk] || nk,
      elo: Math.round(eloPlace[nk] || DEFAULT_ELO),
      elo_vp: Math.round(eloVP[nk] || DEFAULT_ELO),
      games: gamesCount[nk] || 0,
      firsts: firsts[nk] || 0,
      wins: firsts[nk] || 0,
      placeScoreTotal: +(placeScoreTotals[nk] || 0).toFixed(4),
      avgPlace: +(((placeScoreTotals[nk] || 0) / Math.max(1, gamesCount[nk] || 0))).toFixed(4),
      top3: top3Counts[nk] || 0,
      totalVP: totalVPs[nk] || 0,
      avgVP: +(((totalVPs[nk] || 0) / Math.max(1, gamesCount[nk] || 0))).toFixed(2),
      corps: corpsByPlayer[nk] || {},
    };
  }
  data.players = players;
}

function loadElo() {
  try {
    return JSON.parse(fs.readFileSync(ELO_FILE, "utf8"));
  } catch (e) {
    return { players: {}, games: [] };
  }
}

function saveElo(data) {
  fs.writeFileSync(ELO_FILE, JSON.stringify(data, null, 2), "utf8");
}

// HTTP server
var server = http.createServer(function(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Elo-Key");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/elo-submit") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, msg: "Elo API running" }));
    return;
  }

  if (req.method === "POST" && req.url === "/api/elo-submit") {
    if (req.headers["x-elo-key"] !== API_KEY) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "bad key" }));
      return;
    }

    var body = "";
    req.on("data", function(chunk) { body += chunk; });
    req.on("end", function() {
      var payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "invalid JSON" }));
        return;
      }

      var players = payload.players;
      if (!Array.isArray(players) || players.length < 2) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "need 2+ players" }));
        return;
      }
      for (var vi = 0; vi < players.length; vi++) {
        var p = players[vi];
        if (!p.name || p.vp == null || !p.corp) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "each player needs name, vp, corp" }));
          return;
        }
      }

      var sorted = players.slice().sort(function(a, b) { return (b.vp || 0) - (a.vp || 0); });
      var results = [];
      for (var i = 0; i < sorted.length; i++) {
        var place = i + 1;
        if (i > 0 && (sorted[i].vp || 0) === (sorted[i - 1].vp || 0)) {
          place = results[i - 1].place;
        }
        results.push({
          name: normalizeName(sorted[i].name).toLowerCase(),
          displayName: normalizeName(sorted[i].name),
          place: place,
          vp: sorted[i].vp || 0,
          corp: sorted[i].corp || "",
          oldElo: 0, newElo: 0, delta: 0,
        });
      }

      var gameKey = (payload.date || new Date().toISOString()) + "_" +
        results.map(function(r) { return r.name; }).sort().join(",");

      var gameRecord = {
        _key: gameKey,
        date: payload.date || new Date().toISOString(),
        server: payload.server || "extension",
        map: payload.map || "",
        generation: payload.generation || 0,
        playerCount: results.length,
        results: results,
      };

      var data = loadElo();

      for (var gi = 0; gi < data.games.length; gi++) {
        if (data.games[gi]._key === gameKey) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, duplicate: true, players: results.length }));
          return;
        }
      }

      data.games.push(gameRecord);
      rebuildElo(data);
      saveElo(data);

      var msg = results.map(function(r) {
        var pl = data.players[r.name];
        return r.displayName + " " + (pl ? pl.elo : "?");
      }).join(", ");

      console.log("[Elo API] Game recorded: " + msg);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, players: results.length, game_key: gameKey }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not found" }));
});

server.listen(PORT, "127.0.0.1", function() {
  console.log("[Elo API] Listening on 127.0.0.1:" + PORT);
});
