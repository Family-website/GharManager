#!/usr/bin/env bash
# ============================================================
# GharManager Pro — deploy.sh
# Phase 6.1 fix: sw.js's CACHE_NAME ('gharmanager-8', etc.) had
# to be bumped by hand before every deploy — easy to forget,
# and forgetting it means users keep loading a stale cached
# version of the app after you ship a fix. This script bumps
# it automatically, every time, as part of the deploy step.
#
# Usage:
#   chmod +x deploy.sh   (one-time)
#   ./deploy.sh
# ============================================================
set -e

SW_FILE="sw.js"

if [ ! -f "$SW_FILE" ]; then
  echo "❌ $SW_FILE not found — run this from your project root."
  exit 1
fi

# Extract current version number from: const CACHE_NAME = 'gharmanager-8';
CURRENT=$(grep -oE "gharmanager-[0-9]+" "$SW_FILE" | head -1 | grep -oE "[0-9]+$")

if [ -z "$CURRENT" ]; then
  echo "❌ Could not find a CACHE_NAME like 'gharmanager-N' in $SW_FILE."
  exit 1
fi

NEXT=$((CURRENT + 1))
echo "🔄 Bumping cache version: gharmanager-$CURRENT → gharmanager-$NEXT"

# Cross-platform sed (-i '' needed on macOS, plain -i on Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/gharmanager-$CURRENT/gharmanager-$NEXT/g" "$SW_FILE"
else
  sed -i "s/gharmanager-$CURRENT/gharmanager-$NEXT/g" "$SW_FILE"
fi

echo "✅ $SW_FILE updated to gharmanager-$NEXT"
echo ""
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting,functions,firestore:rules

echo ""
echo "✅ Deploy complete — users will get gharmanager-$NEXT on next load."
