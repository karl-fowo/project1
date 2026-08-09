#!/usr/bin/env bash
# init.sh -- Verify the project builds cleanly before starting work.
# Run this after cloning or when resuming work.
set -euo pipefail

echo "=== Project 01 Init ==="
echo ""

echo "[1/3] Installing dependencies..."
npm install --legacy-peer-deps --ignore-scripts --cache "$PWD/.npm-cache"
echo ""

echo "[2/3] Restoring native binaries..."
if [ ! -x "$PWD/node_modules/@esbuild/darwin-arm64/bin/esbuild" ]; then
  mkdir -p /tmp/kb-install
  curl -L --fail --silent --show-error -o /tmp/kb-install/esbuild.tgz https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.12.tgz
  mkdir -p "$PWD/node_modules/@esbuild/darwin-arm64"
  tar -xzf /tmp/kb-install/esbuild.tgz -C "$PWD/node_modules/@esbuild/darwin-arm64" --strip-components=1
fi

if [ ! -x "$PWD/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]; then
  mkdir -p /tmp/kb-install
  curl -L --fail --silent --show-error -o /tmp/kb-install/electron.zip https://github.com/electron/electron/releases/download/v33.4.11/electron-v33.4.11-darwin-arm64.zip
  mkdir -p "$PWD/node_modules/electron/dist"
  unzip -q -o /tmp/kb-install/electron.zip -d "$PWD/node_modules/electron/dist"
fi
echo ""

echo "[3/3] Running type checks..."
npm run check
echo ""

echo "[4/4] Building project..."
npm run build
echo ""

echo "=== Init complete. All checks passed. ==="
echo "Run 'npm run dev' to launch the application."
