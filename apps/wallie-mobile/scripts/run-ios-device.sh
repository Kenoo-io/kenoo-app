#!/usr/bin/env bash
# Build → devicectl install (reliable) → keep Metro running.
# PostShow runs Metro directly (not via turbo) and does not rely on Expo auto-launch.

set -uo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVICE_UDID="${IOS_DEVICE_UDID:-00008110-001411EE3A86801E}"
METRO_PORT="${METRO_PORT:-8081}"
METRO_PID=""
STARTED_METRO=false

pick_metro_port() {
  for port in 8081 8082 8083 8084 8085; do
    if ! lsof -i ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      METRO_PORT="$port"
      return
    fi
  done
  echo "No free Metro port (8081-8085). Stop other Expo servers first."
  exit 1
}

stop_metro() {
  if [[ "$STARTED_METRO" == "true" ]] && [[ -n "$METRO_PID" ]] && kill -0 "$METRO_PID" 2>/dev/null; then
    kill "$METRO_PID" 2>/dev/null || true
    wait "$METRO_PID" 2>/dev/null || true
  fi
}
trap stop_metro INT TERM

find_built_app() {
  local -a apps=()
  while IFS= read -r app; do
    apps+=("$app")
  done < <(find "$HOME/Library/Developer/Xcode/DerivedData" -path "*/Build/Products/Debug-iphoneos/Wallie.app" 2>/dev/null | sort)

  if [[ "${#apps[@]}" -eq 0 ]]; then
    return 1
  fi

  printf '%s\n' "${apps[-1]}"
}

ensure_metro_running() {
  if lsof -i ":$METRO_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Metro already running on port $METRO_PORT (use that terminal for bundle logs)."
    return
  fi

  pick_metro_port
  echo "Starting Metro on port $METRO_PORT..."
  (
    cd "$APP_ROOT"
    exec pnpm exec expo start --dev-client --port "$METRO_PORT"
  ) &
  METRO_PID=$!
  STARTED_METRO=true

  for _ in $(seq 1 80); do
    if lsof -i ":$METRO_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "Metro ready on port $METRO_PORT"
      return
    fi
    if ! kill -0 "$METRO_PID" 2>/dev/null; then
      echo "Metro failed to start."
      exit 1
    fi
    sleep 0.25
  done
}

ensure_metro_running

echo "Building Wallie for device (ignore Expo auto-launch errors)..."
(
  cd "$APP_ROOT"
  pnpm exec expo run:ios --device "$DEVICE_UDID" --no-bundler
) || true

APP_PATH="$(find_built_app || true)"
if [[ -z "${APP_PATH:-}" ]]; then
  echo "Could not find Wallie.app in DerivedData after build."
  exit 1
fi

echo "Installing via devicectl: $APP_PATH"
xcrun devicectl device install app --device "$DEVICE_UDID" "$APP_PATH"

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
cat <<EOF

Installed. Open Wallie on your iPhone now.
Metro port: $METRO_PORT${LAN_IP:+ | Mac IP: $LAN_IP}
Same Wi-Fi required. Allow Local Network if iOS asks.

If Expo printed a Security/devicectl error above, ignore it — this script installed the app separately.

EOF

if [[ "$STARTED_METRO" == "true" ]] && [[ -n "$METRO_PID" ]]; then
  wait "$METRO_PID"
elif ! lsof -i ":$METRO_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Start Metro in another terminal: pnpm dev:wallie-mobile"
fi
