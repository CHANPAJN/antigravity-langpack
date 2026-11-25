#!/bin/sh
# antigravity-langpack one-line & local installer (macOS & Linux)
# Supports both local checkout (./install.sh) and curl -fsSL .../install.sh | sh [-s -- --lang ja]
set -eu

REPO_URL="https://github.com/CHANPAJN/antigravity-langpack.git"
TARBALL_URL="https://codeload.github.com/CHANPAJN/antigravity-langpack/tar.gz/refs/heads/main"
DEFAULT_INSTALL_DIR="${AGY_LANGPACK_HOME:-$HOME/.antigravity-langpack}"
NODE_VERSION="v22.14.0"

check_node_ok() {
  node_bin="$1"
  [ -x "$node_bin" ] || command -v "$node_bin" >/dev/null 2>&1 || return 1
  "$node_bin" -e 'const [maj,min]=process.versions.node.split(".").map(Number);process.exit(maj>22||(maj===22&&min>=13)?0:1)' >/dev/null 2>&1
}

resolve_repo_dir() {
  if [ -n "${0:-}" ] && [ "$0" != "sh" ] && [ "$0" != "bash" ] && [ "$0" != "-sh" ] && [ "$0" != "-bash" ]; then
    maybe_dir="$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd || true)"
    if [ -n "$maybe_dir" ] && [ -f "$maybe_dir/cli.mjs" ] && [ -d "$maybe_dir/dict" ]; then
      printf '%s\n' "$maybe_dir"
      return 0
    fi
  fi
  if [ -f "./cli.mjs" ] && [ -d "./dict" ]; then
    pwd
    return 0
  fi

  echo "[antigravity-langpack] Setting up repository in $DEFAULT_INSTALL_DIR ..."
  if [ -d "$DEFAULT_INSTALL_DIR/.git" ]; then
    git -C "$DEFAULT_INSTALL_DIR" pull --ff-only >/dev/null 2>&1 || true
    printf '%s\n' "$DEFAULT_INSTALL_DIR"
    return 0
  fi

  if command -v git >/dev/null 2>&1; then
    rm -rf "$DEFAULT_INSTALL_DIR"
    git clone --depth 1 "$REPO_URL" "$DEFAULT_INSTALL_DIR"
    printf '%s\n' "$DEFAULT_INSTALL_DIR"
    return 0
  fi

  rm -rf "$DEFAULT_INSTALL_DIR"
  mkdir -p "$DEFAULT_INSTALL_DIR"
  tmp_tar="$(mktemp "${TMPDIR:-/tmp}/agy-langpack.XXXXXX.tar.gz")"
  curl -fsSL "$TARBALL_URL" -o "$tmp_tar"
  tar -xzf "$tmp_tar" -C "$DEFAULT_INSTALL_DIR" --strip-components=1
  rm -f "$tmp_tar"
  printf '%s\n' "$DEFAULT_INSTALL_DIR"
}

ensure_node_binary() {
  repo_dir="$1"
  if check_node_ok "node"; then
    command -v node
    return 0
  fi
  for cand in /opt/homebrew/bin/node /usr/local/bin/node "$repo_dir/.runtime/node/bin/node"; do
    if check_node_ok "$cand"; then
      printf '%s\n' "$cand"
      return 0
    fi
  done

  os_s="$(uname -s)"
  arch_m="$(uname -m)"
  case "$os_s" in
    Darwin) plat="darwin" ;;
    Linux) plat="linux" ;;
    *)
      echo "[ERROR] Unsupported OS ($os_s). Install official Node.js >= 22.13 from https://nodejs.org/" >&2
      exit 1
      ;;
  esac
  case "$arch_m" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64) arch="x64" ;;
    *)
      echo "[ERROR] Unsupported CPU architecture ($arch_m). Install official Node.js >= 22.13 from https://nodejs.org/" >&2
      exit 1
      ;;
  esac

  pkg_name="node-${NODE_VERSION}-${plat}-${arch}.tar.gz"
  base_url="https://nodejs.org/dist/${NODE_VERSION}"
  rt_dir="$repo_dir/.runtime"
  mkdir -p "$rt_dir"
  tmp_pkg="$rt_dir/$pkg_name"
  tmp_sums="$rt_dir/SHASUMS256.txt"

  echo "[antigravity-langpack] Node.js >= 22.13 not found in PATH; downloading official ${pkg_name} (verified via SHASUMS256) ..." >&2
  curl -fsSL "${base_url}/SHASUMS256.txt" -o "$tmp_sums"
  curl -fsSL "${base_url}/${pkg_name}" -o "$tmp_pkg"

  expected_sha="$(awk -v f="$pkg_name" '$2 == f || $2 == ("*" f) { print $1; exit }' "$tmp_sums")"
  if [ -z "$expected_sha" ]; then
    rm -f "$tmp_pkg" "$tmp_sums"
    echo "[ERROR] Could not find SHA-256 entry for $pkg_name in official SHASUMS256.txt" >&2
    exit 1
  fi
  if command -v shasum >/dev/null 2>&1; then
    actual_sha="$(shasum -a 256 "$tmp_pkg" | awk '{print $1}')"
  elif command -v sha256sum >/dev/null 2>&1; then
    actual_sha="$(sha256sum "$tmp_pkg" | awk '{print $1}')"
  else
    rm -f "$tmp_pkg" "$tmp_sums"
    echo "[ERROR] Neither shasum nor sha256sum available to verify Node.js archive" >&2
    exit 1
  fi

  if [ "$actual_sha" != "$expected_sha" ]; then
    rm -f "$tmp_pkg" "$tmp_sums"
    echo "[ERROR] SHA-256 mismatch for $pkg_name (expected $expected_sha, got $actual_sha)" >&2
    exit 1
  fi

  rm -rf "$rt_dir/node"
  mkdir -p "$rt_dir/node"
  tar -xzf "$tmp_pkg" -C "$rt_dir/node" --strip-components=1
  rm -f "$tmp_pkg" "$tmp_sums"
  printf '%s\n' "$rt_dir/node/bin/node"
}

TARGET_DIR="$(resolve_repo_dir)"
cd "$TARGET_DIR"
NODE_EXEC="$(ensure_node_binary "$TARGET_DIR")"

if [ -n "${AGY_LANG:-}" ]; then
  exec "$NODE_EXEC" --disable-warning=ExperimentalWarning cli.mjs install --lang "$AGY_LANG" "$@"
fi
exec "$NODE_EXEC" --disable-warning=ExperimentalWarning cli.mjs install "$@"
