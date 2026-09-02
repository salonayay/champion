#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "--> Piston (judge, port 2000)"
if [ -z "$(docker ps -q -f name=piston)" ]; then
  docker start piston >/dev/null 2>&1 || { echo "    FAILED - check: docker ps -a"; exit 1; }
  sleep 3
fi
echo "    up"

echo "--> Socket server (port 4000)"
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
node server/index.mjs &
SOCKET_PID=$!
sleep 1
echo "    up (pid $SOCKET_PID)"

trap "kill $SOCKET_PID 2>/dev/null" EXIT

echo "--> Next.js (port 3000)"
npm run dev
