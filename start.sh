#!/usr/bin/env bash
# start.sh — Start the OpenBlog development server.
#
# Usage:
#   ./start.sh            # serves on http://localhost:8080
#   PORT=3000 ./start.sh  # serves on http://localhost:3000
#
# Assumes Python 3 is installed (run ./install.sh first if unsure).

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PORT="${PORT:-8080}"

# ── Verify Python 3 is available ──────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo -e "${RED}Error: Python 3 is not installed.${NC}"
  echo "Run ${BOLD}./install.sh${NC} first to install dependencies."
  exit 1
fi

# ── Find the directory this script lives in (repo root) ───────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BOLD}====================================${NC}"
echo -e "${BOLD}  ✍️  OpenBlog${NC}"
echo -e "${BOLD}====================================${NC}"
echo ""
echo -e "  ${GREEN}URL:${NC}  http://localhost:${PORT}"
echo "  Press Ctrl+C to stop the server."
echo ""

cd "$SCRIPT_DIR"
python3 -m http.server "$PORT" --bind 127.0.0.1
