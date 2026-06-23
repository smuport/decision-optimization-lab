#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FRONTEND_PORT="${FRONTEND_PORT:-4200}"
BACKEND_PORT="${BACKEND_PORT:-3000}"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.nvm/nvm.sh"
  if [ -f ".nvmrc" ]; then
    nvm use
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not available. Install pnpm or enable corepack first." >&2
  exit 1
fi

echo "Starting Decision Optimization Lab"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Backend:  http://localhost:${BACKEND_PORT}/api/v1/health"
echo
echo "Tip: override ports with FRONTEND_PORT=4201 BACKEND_PORT=3001 pnpm dev:app"
echo "Press Ctrl+C to stop both services."
echo

backend_pid=""
frontend_pid=""
cleaned_up=0

cleanup() {
  if [ "$cleaned_up" -eq 1 ]; then
    return
  fi
  cleaned_up=1

  echo
  echo "Stopping services..."
  if [ -n "$backend_pid" ]; then
    kill "$backend_pid" 2>/dev/null || true
  fi
  if [ -n "$frontend_pid" ]; then
    kill "$frontend_pid" 2>/dev/null || true
  fi
  wait "$backend_pid" 2>/dev/null || true
  wait "$frontend_pid" 2>/dev/null || true
}

handle_signal() {
  cleanup
  exit 0
}

trap handle_signal INT TERM
trap cleanup EXIT

PORT="$BACKEND_PORT" pnpm --filter backend dev &
backend_pid="$!"

pnpm --filter frontend exec ng serve --host 0.0.0.0 --port "$FRONTEND_PORT" &
frontend_pid="$!"

while true; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    wait "$backend_pid"
    exit $?
  fi

  if ! kill -0 "$frontend_pid" 2>/dev/null; then
    wait "$frontend_pid"
    exit $?
  fi

  sleep 1
done
