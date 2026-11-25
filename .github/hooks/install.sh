#!/usr/bin/env sh
# Instala os git hooks versionados em .github/hooks.
# Uso: pnpm hooks:install   (ou: sh .github/hooks/install.sh)
set -eu

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

HOOK_DIR=".github/hooks"

for hook in pre-commit commit-msg pre-push post-merge post-checkout; do
  [ -f "$HOOK_DIR/$hook" ] || {
    echo "erro: hook ausente: $HOOK_DIR/$hook" >&2
    exit 1
  }
  chmod +x "$HOOK_DIR/$hook"
done
chmod +x "$HOOK_DIR/checks.sh" "$HOOK_DIR/install.sh" "$HOOK_DIR/uninstall.sh"

git config core.hooksPath "$HOOK_DIR"

echo "Hooks instalados em: $(git config --get core.hooksPath)"
echo "Hooks ativos:"
for hook in pre-commit commit-msg pre-push post-merge post-checkout; do
  echo "  - $hook"
done
echo ""
echo "Para desinstalar: pnpm hooks:uninstall"
