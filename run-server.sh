#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..." >> /home/z/my-project/server-loop.log
  npx next dev -p 3000 >> /home/z/my-project/server-loop.log 2>&1
  echo "[$(date)] Server exited, restarting in 3s..." >> /home/z/my-project/server-loop.log
  sleep 3
done
