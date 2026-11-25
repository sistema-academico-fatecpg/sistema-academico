#!/usr/bin/env sh
# Remove a configuração de hooks versionados (volta a usar .git/hooks).
set -eu

cd "$(git rev-parse --show-toplevel)"
git config --unset core.hooksPath || true
echo "core.hooksPath removido; o Git voltou a usar .git/hooks."
