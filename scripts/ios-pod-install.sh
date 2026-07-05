#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PODFILE="$ROOT/ios/Podfile"
SOURCE_LINE="source 'https://github.com/CocoaPods/Specs.git'"

if [[ ! -f "$PODFILE" ]]; then
  echo "No ios/Podfile found. Run: pnpm run:ios (or expo prebuild) first."
  exit 1
fi

if ! grep -q "github.com/CocoaPods/Specs.git" "$PODFILE"; then
  # Avoid CocoaPods CDN SSL flakes (cdn.cocoapods.org over IPv6).
  sed -i '' "1s;^;${SOURCE_LINE}\n\n;" "$PODFILE"
  echo "[verso] Added git CocoaPods specs source to ios/Podfile"
fi

cd "$ROOT/ios"
pod install "$@"
