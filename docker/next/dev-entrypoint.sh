#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${dev_pid:-}" ]]; then
    if kill -0 "${dev_pid}" 2>/dev/null; then
      kill "${dev_pid}" 2>/dev/null || true
      wait "${dev_pid}" 2>/dev/null || true
    fi
  fi
  exit 0
}

compute_lock_checksum() {
  if [[ -f pnpm-lock.yaml ]]; then
    sha1sum pnpm-lock.yaml | awk '{ print $1 }'
  else
    echo "missing"
  fi
}

trap cleanup SIGTERM SIGINT

last_lock_checksum=""

while true; do
  current_lock_checksum="$(compute_lock_checksum)"

  if [[ "$current_lock_checksum" != "$last_lock_checksum" ]]; then
    if [[ -t 1 ]]; then
      printf '[dev-entrypoint] Detected lockfile change, installing dependencies...\n'
    fi
    pnpm install --frozen-lockfile=false --prefer-offline
    last_lock_checksum="$(compute_lock_checksum)"
  fi

  pnpm dev --hostname 0.0.0.0 &
  dev_pid=$!
  wait "${dev_pid}"
  exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    if [[ -t 1 ]]; then
      printf '[dev-entrypoint] Dev server exited cleanly, restarting to keep container alive...\n'
    fi
    sleep 1
  else
    printf '[dev-entrypoint] Dev server exited with code %s, restarting in 2 seconds...\n' "$exit_code" >&2
    sleep 2
  fi

done
