#!/usr/bin/env bash
set -uo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
METRO_PORT="${METRO_PORT:-8081}"
METRO_PID=""
STARTED_METRO=false

stop_metro() {
  if [[ "$STARTED_METRO" == "true" ]] && [[ -n "$METRO_PID" ]] && kill -0 "$METRO_PID" 2>/dev/null; then
    kill "$METRO_PID" 2>/dev/null || true
    wait "$METRO_PID" 2>/dev/null || true
  fi
}
trap stop_metro INT TERM

if ! lsof -i ":$METRO_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Starting Metro on localhost:$METRO_PORT..."
  (
    cd "$APP_ROOT"
    exec env REACT_NATIVE_PACKAGER_HOSTNAME=localhost pnpm exec expo start --dev-client --port "$METRO_PORT" --clear
  ) &
  METRO_PID=$!
  STARTED_METRO=true

  for _ in $(seq 1 80); do
    if lsof -i ":$METRO_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
else
  echo "Metro already on port $METRO_PORT"
fi

echo "Building for iOS Simulator..."
(
  cd "$APP_ROOT"
  env REACT_NATIVE_PACKAGER_HOSTNAME=localhost pnpm exec expo run:ios --no-bundler
) || true

if [[ "$STARTED_METRO" == "true" ]] && [[ -n "$METRO_PID" ]]; then
  wait "$METRO_PID"
fi
