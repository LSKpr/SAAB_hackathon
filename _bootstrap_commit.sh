#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
TREE=$(git write-tree)
COMMIT=$(git commit-tree "$TREE" -m "Add Boreal Passage defense console")
git update-ref refs/heads/feature/boreal-passage-console "$COMMIT"
git symbolic-ref HEAD refs/heads/feature/boreal-passage-console
git log -1 --oneline
