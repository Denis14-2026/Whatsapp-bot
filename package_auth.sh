#!/bin/sh
# Package the auth/ folder into auth.tar.gz for manual upload to Railway persistent disk
if [ -d "auth" ]; then
  tar -czf auth.tar.gz auth
  echo "Created auth.tar.gz - upload this file to your Railway persistent disk or extract it in the mounted volume."
else
  echo "No auth/ directory found. Run the bot locally first to generate it by scanning the QR."
fi
