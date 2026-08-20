#!/bin/bash
# Detached restart of the dsh web GUI (run with setsid/nohup).
# 1. waits for the calling command to return, 2. kills the old dsh web,
# 3. starts a fresh `dsh web` from the same profile, logging to a file.
set -u
LOG=/tmp/dsh-restart.log
echo "[restart] $(date '+%F %T') begin" >> "$LOG"

# give the invoking tool call time to return
sleep 3

OLD_PID="${1:-}"
if [ -z "$OLD_PID" ]; then
  OLD_PID=$(lsof -ti :3080 -sTCP:LISTEN 2>/dev/null | head -1)
fi
echo "[restart] old pid: ${OLD_PID:-none}" >> "$LOG"

if [ -n "$OLD_PID" ]; then
  kill "$OLD_PID" 2>/dev/null
  for i in $(seq 1 20); do
    if ! kill -0 "$OLD_PID" 2>/dev/null; then break; fi
    sleep 0.5
  done
  kill -9 "$OLD_PID" 2>/dev/null
fi

# wait for the port to free
for i in $(seq 1 30); do
  if ! lsof -ti :3080 -sTCP:LISTEN >/dev/null 2>&1; then break; fi
  sleep 0.5
done

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node@22/bin:/Users/bytedance/DeepSeek/.tools/node_modules/.bin:$PATH"
cd /Users/bytedance/DeepSeek || exit 1

echo "[restart] starting dsh web" >> "$LOG"
nohup dsh web >> "$LOG" 2>&1 &
echo "[restart] launched pid $!" >> "$LOG"

# report readiness
for i in $(seq 1 40); do
  if curl -s -o /dev/null http://127.0.0.1:3080/ 2>/dev/null; then
    echo "[restart] $(date '+%F %T') GUI is up on http://127.0.0.1:3080" >> "$LOG"
    exit 0
  fi
  sleep 0.5
done
echo "[restart] $(date '+%F %T') TIMEOUT waiting for GUI" >> "$LOG"
exit 1
