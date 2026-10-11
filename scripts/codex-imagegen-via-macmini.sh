#!/usr/bin/env bash
# Run the codex-imagegen launcher with Codex's traffic routed through the Mac
# mini, whose connection to chatgpt.com survives long image renders (ADR-0024).
#
# Usage:
#   scripts/codex-imagegen-via-macmini.sh [launcher args...]   # e.g. --prompt-file P --image I
#   scripts/codex-imagegen-via-macmini.sh --down               # stop tunnel + remote proxy
#
# What it does, idempotently:
#   1. Starts scripts/macmini-proxy/connect_proxy.py on the mini (127.0.0.1:8899
#      there — never exposed on the LAN), copying it over if needed.
#   2. Opens `ssh -L 127.0.0.1:8899:127.0.0.1:8899 macmini` on this Mac.
#   3. Health-checks chatgpt.com through it, then runs the launcher with
#      HTTPS_PROXY/HTTP_PROXY/ALL_PROXY=http://127.0.0.1:8899.
# Codex only speaks HTTP proxies — a SOCKS tunnel (`ssh -D`) fails instantly
# with is_connect=true, which is why the mini runs a CONNECT proxy instead.
#
# If the mini is unreachable or the health check fails, it warns on stderr and
# runs the launcher directly (the local system proxy, ADR-0023's path).
#
# Needs: an `ssh macmini` host alias with key auth, python3 on the mini, and
# HTTPS_PROXY/HTTP_PROXY/ALL_PROXY on the launcher's SAFE_ENV_NAMES allowlist.
# Env overrides: MACMINI_HOST (default macmini), MACMINI_PROXY_PORT (8899),
# CODEX_IMAGEGEN_LAUNCHER (default ~/.claude/skills/codex-imagegen/scripts/run_codex_imagegen.py).
set -euo pipefail

host=${MACMINI_HOST:-macmini}
port=${MACMINI_PROXY_PORT:-8899}
launcher=${CODEX_IMAGEGEN_LAUNCHER:-$HOME/.claude/skills/codex-imagegen/scripts/run_codex_imagegen.py}
here=$(cd "$(dirname "$0")" && pwd)
proxy_src="$here/macmini-proxy/connect_proxy.py"
remote_py=/tmp/connect_proxy.py
ssh_opts=(-o ConnectTimeout=8 -o BatchMode=yes)
forward_pat="ssh.*-L 127.0.0.1:${port}:127.0.0.1:${port} ${host}"

log() { echo "codex-imagegen-via-macmini: $*" >&2; }

if [ "${1:-}" = "--down" ]; then
  pkill -f "$forward_pat" && log "closed local tunnel" || log "no local tunnel"
  ssh "${ssh_opts[@]}" "$host" "pkill -f '$remote_py' && echo stopped || echo 'not running'" >&2 || log "mini unreachable"
  exit 0
fi

up() {
  ssh "${ssh_opts[@]}" "$host" true 2>/dev/null || return 1
  if ! ssh "${ssh_opts[@]}" "$host" "lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1"; then
    scp -q "${ssh_opts[@]}" "$proxy_src" "$host:$remote_py" || return 1
    ssh "${ssh_opts[@]}" "$host" \
      "PATH=/opt/homebrew/bin:/usr/local/bin:\$PATH; nohup python3 $remote_py $port >/tmp/connect_proxy.log 2>&1 & sleep 1; lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null" \
      || return 1
    log "started proxy on $host:127.0.0.1:$port"
  fi
  if ! pgrep -f "$forward_pat" >/dev/null; then
    ssh -f -N "${ssh_opts[@]}" -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
      -L "127.0.0.1:$port:127.0.0.1:$port" "$host" || return 1
    log "opened tunnel 127.0.0.1:$port -> $host"
  fi
  # Any HTTP status (chatgpt.com answers 403 to a bare GET) proves the path works.
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
    --proxy "http://127.0.0.1:$port" https://chatgpt.com/backend-api/ 2>/dev/null) || return 1
  [ "$code" != 000 ]
}

if ! up; then
  log "Mac mini path unavailable — running the launcher directly (local system proxy)"
  exec python3 "$launcher" "$@"
fi

export HTTPS_PROXY="http://127.0.0.1:$port" HTTP_PROXY="http://127.0.0.1:$port" ALL_PROXY="http://127.0.0.1:$port"
log "routing Codex through $host"
exec python3 "$launcher" "$@"
