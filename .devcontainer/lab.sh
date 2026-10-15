#!/bin/sh
# Run by the codespace each time the editor connects (devcontainer.json): checks out the private
# forest-survivor-assets next to this repository, brings this checkout up to date, then runs the
# Sprite Lab on port 3001, unless it's running already. The lab itself pulls and pushes its saves.
cd "$(dirname "$0")/.." || exit 1

if curl -s -o /dev/null http://localhost:3001/; then
  echo "The Sprite Lab is already running on port 3001."
  exit 0
fi
assets="$(cd .. && pwd)/forest-survivor-assets"
[ -d "$assets" ] || [ -w .. ] || assets="$HOME/forest-survivor-assets"
if [ ! -d "$assets/.git" ]; then
  echo "Checking out bonegor/forest-survivor-assets (the packs, the music and the lab's saves)..."
  git clone -q --depth 1 https://github.com/bonegor/forest-survivor-assets "$assets" ||
    echo "No access to bonegor/forest-survivor-assets: the lab runs without the packs, and keeps its saves in this codespace."
fi
git pull -q --ff-only || echo "This checkout couldn't be brought up to date; the lab runs as it is."
export LAB_ASSETS="$assets"
exec node gms/3001/serve.mjs 3001
