#!/usr/bin/env bash
# install.sh — Check and install dependencies for OpenBlog.
#
# OpenBlog is a pure HTML + JavaScript application.
# The only runtime dependency is a simple HTTP server (Python 3's built-in
# http.server module) used by start.sh.

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # no colour

echo ""
echo -e "${BOLD}=== OpenBlog Installer ===${NC}"
echo ""

# ── Python 3 ──────────────────────────────────────────────────────────────────
check_python() {
  if command -v python3 &>/dev/null; then
    PY_VER=$(python3 --version 2>&1)
    echo -e "${GREEN}✓ ${PY_VER} found${NC} — will be used to serve the app."
    return 0
  fi
  return 1
}

if check_python; then
  : # already found
else
  echo -e "${YELLOW}⚠  Python 3 not found. Attempting to install…${NC}"
  echo ""

  if command -v apt-get &>/dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y python3
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y python3
  elif command -v yum &>/dev/null; then
    sudo yum install -y python3
  elif command -v brew &>/dev/null; then
    brew install python3
  elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm python
  else
    echo -e "${RED}✗ Could not install Python 3 automatically.${NC}"
    echo ""
    echo "Please install Python 3 manually:"
    echo "  • macOS:   brew install python3"
    echo "             or download from https://www.python.org/downloads/"
    echo "  • Debian / Ubuntu: sudo apt-get install python3"
    echo "  • Fedora / RHEL:   sudo dnf install python3"
    echo "  • Windows: https://www.python.org/downloads/"
    echo ""
    exit 1
  fi

  # Verify installation succeeded
  if check_python; then
    echo ""
    echo -e "${GREEN}✓ Python 3 installed successfully.${NC}"
  else
    echo -e "${RED}✗ Python 3 installation failed. Please install it manually.${NC}"
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}${BOLD}All dependencies are satisfied!${NC}"
echo ""
echo "Run ${BOLD}./start.sh${NC} to launch OpenBlog."
echo ""
