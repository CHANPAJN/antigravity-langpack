#!/bin/sh
set -e
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Official Node.js >= 22.13 is required. Install via https://nodejs.org/ or brew install node" >&2
  exit 1
fi
exec node --disable-warning=ExperimentalWarning cli.mjs install "$@"
