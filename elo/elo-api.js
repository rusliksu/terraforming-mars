const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8082;
const API_KEY = "tm-elo-2024";
const ELO_FILE = path.join(__dirname, "elo-data.json");
const ELO_COMPAT_FILE = path.join(__dirname, "data.json");
const DEFAULT_ELO = 1500;
const K = 32;
const MERGES = require("./player_name_aliases.json");

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
  var text = JSON.stringify(data, null, 2);
  fs.writeFileSync(ELO_FILE, text, "utf8");
  fs.writeFileSync(ELO_COMPAT_FILE, text, "utf8");
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

      var gameKey = payload.gameId || payload.gameKey || ((payload.date || new Date().toISOString()) + "_" +
        results.map(function(r) { return r.name; }).sort().join(","));
      var endId = payload.endId || payload.spectatorId || "";
      var completedTime = payload.completedTime || 0;
      var startedTime = payload.startedTime || 0;
      var durationMs = payload.durationMs;
      if ((durationMs == null || durationMs < 0) && completedTime && startedTime) {
        durationMs = Math.max(0, (completedTime - startedTime) * 1000);
      }
      var durationMinutes = payload.durationMinutes;
      if ((durationMinutes == null || durationMinutes < 0) && durationMs != null) {
        durationMinutes = Math.round(durationMs / 60000);
      }

      var gameRecord = {
        _key: gameKey,
        gameId: payload.gameId || gameKey,
        endId: endId,
        date: payload.date || new Date().toISOString(),
        server: payload.server || "extension",
        map: payload.map || "",
        generation: payload.generation || 0,
        playerCount: results.length,
        startedTime: startedTime || undefined,
        completedTime: completedTime,
        durationMs: durationMs,
        durationMinutes: durationMinutes,
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
