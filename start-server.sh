#!/bin/bash
cd /home/z/my-project
while true; do
  node /home/z/my-project/.next/standalone/server.js
  echo "server died, restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done
