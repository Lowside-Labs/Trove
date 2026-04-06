#!/usr/bin/env bash

set -euo pipefail

REPO_OWNER="${TROVE_REPO_OWNER:-Lowside-Labs}"
REPO_NAME="${TROVE_REPO_NAME:-Trove}"
REPO_BRANCH="${TROVE_REPO_BRANCH:-main}"
ARCHIVE_URL="${TROVE_ARCHIVE_URL:-https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${REPO_BRANCH}.tar.gz}"

INSTALL_ROOT="${TROVE_INSTALL_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/trove}"
BIN_DIR="${TROVE_BIN_DIR:-$HOME/.local/bin}"
TMP_DIR="$(mktemp -d)"
SOURCE_DIR="${TMP_DIR}/${REPO_NAME}-${REPO_BRANCH}"
PACKAGE_MANAGER_CMD=()

cleanup() {
  rm -rf "$TMP_DIR"
}

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

check_node() {
  need_cmd node

  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"

  if [ "$major" -lt 22 ]; then
    fail "Trove requires Node 22 or newer. Current version: $(node --version)"
  fi
}

resolve_package_manager() {
  if command -v pnpm >/dev/null 2>&1; then
    PACKAGE_MANAGER_CMD=("pnpm")
    return
  fi

  if command -v corepack >/dev/null 2>&1; then
    PACKAGE_MANAGER_CMD=("corepack" "pnpm")
    return
  fi

  fail "missing required command: pnpm (or corepack)"
}

download_source() {
  need_cmd curl
  need_cmd tar

  printf 'Downloading %s...\n' "$ARCHIVE_URL"
  curl -fsSL "$ARCHIVE_URL" | tar -xz -C "$TMP_DIR"
}

install_trove() {
  mkdir -p "$BIN_DIR"
  rm -rf "$INSTALL_ROOT"
  mkdir -p "$(dirname "$INSTALL_ROOT")"
  mv "$SOURCE_DIR" "$INSTALL_ROOT"

  cd "$INSTALL_ROOT"

  printf 'Installing dependencies...\n'
  "${PACKAGE_MANAGER_CMD[@]}" install --frozen-lockfile --silent

  printf 'Building Trove...\n'
  "${PACKAGE_MANAGER_CMD[@]}" run --silent build

  printf 'Pruning dev dependencies...\n'
  "${PACKAGE_MANAGER_CMD[@]}" prune --prod --silent

  ln -sf "$INSTALL_ROOT/packages/trove-cli/dist/cli.js" "$BIN_DIR/trove"
}

print_next_steps() {
  printf '\nInstalled Trove.\n'
  printf 'Binary: %s/trove\n' "$BIN_DIR"
  printf 'Workspace example:\n'
  printf '  trove init --path ~/Trove\n'
  printf '  trove sync x --browser chrome\n'
  printf '  cd ~/Trove && claude\n'

  case ":$PATH:" in
    *":$BIN_DIR:"*) ;;
    *)
      printf '\n%s is not currently on your PATH.\n' "$BIN_DIR"
      printf 'Add this to your shell profile:\n'
      printf '  export PATH="%s:$PATH"\n' "$BIN_DIR"
      ;;
  esac
}

main() {
  trap cleanup EXIT
  check_node
  resolve_package_manager
  download_source
  install_trove
  print_next_steps
}

main "$@"
