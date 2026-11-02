#!/bin/sh
# Serves data/tiles over HTTP for local development.
cd "$(dirname "$0")/tiles" || exit 1
exec python3 -m http.server 8000 --bind 0.0.0.0
