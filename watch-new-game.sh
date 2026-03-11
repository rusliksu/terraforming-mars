#!/bin/bash
# Watch for new TM games and auto-start logger
# Usage: ./watch-new-game.sh [player_name]

PLAYER="${1:-Gydro}"
SERVER_ID="${SERVER_ID:-47117f012465}"
LOG_DIR="/home/openclaw/terraforming-mars/logs"
SCRIPT_DIR="/home/openclaw/terraforming-mars"
KNOWN_FILE="$LOG_DIR/.known_games"
POLL_SEC=30

mkdir -p "$LOG_DIR"
touch "$KNOWN_FILE"

echo "[watch] Monitoring for new games by $PLAYER (poll every ${POLL_SEC}s)..."

while true; do
  GAMES=$(curl -sf "http://localhost:8081/api/games?serverId=$SERVER_ID" 2>/dev/null)
  if [ -z "$GAMES" ]; then
    sleep "$POLL_SEC"
    continue
  fi

  echo "$GAMES" | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  for g in (data if isinstance(data, list) else []):
    gid = g.get(\"gameId\", g) if isinstance(g, dict) else g
    print(gid)
except: pass
" 2>/dev/null | while read -r GID; do
    if grep -qF "$GID" "$KNOWN_FILE" 2>/dev/null; then
      continue
    fi

    GAME_DATA=$(curl -sf "http://localhost:8081/api/game?id=$GID&serverId=$SERVER_ID" 2>/dev/null)
    HAS_PLAYER=$(echo "$GAME_DATA" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  for p in d.get(\"players\", []):
    if \"$PLAYER\" in p.get(\"name\", \"\"):
      print(\"yes\"); break
except: pass
" 2>/dev/null)

    echo "$GID" >> "$KNOWN_FILE"

    if [ "$HAS_PLAYER" = "yes" ]; then
      echo "[watch] $(date +%H:%M:%S) New game found: $GID — starting logger!"
      nohup python3 "$SCRIPT_DIR/tm-game-logger.py" "$GID" --interval 15 --log-dir "$LOG_DIR" > "$LOG_DIR/${GID}.stdout" 2>&1 &
      echo "[watch] Logger PID: $!"
    fi
  done

  sleep "$POLL_SEC"
done
