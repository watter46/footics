#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_ROOT="backup.regista.${TIMESTAMP}"

echo "Starting clean-slate migration..."

# 1. 既存の Regista / 旧エージェント資産を一括完全退避 (非破壊)
mkdir -p "$BACKUP_ROOT"

if [[ -d ".regista" ]]; then
  mv .regista "$BACKUP_ROOT/.regista"
  echo "Moved .regista/ -> $BACKUP_ROOT/.regista"
fi

if [[ -d ".agents" ]]; then
  mv .agents "$BACKUP_ROOT/.agents"
  echo "Moved .agents/ -> $BACKUP_ROOT/.agents"
fi

if [[ -f "AGENTS.md" ]]; then
  mv AGENTS.md "$BACKUP_ROOT/AGENTS.md"
  echo "Moved AGENTS.md -> $BACKUP_ROOT/AGENTS.md"
fi

# 2. 0から新アーキテクチャの最小ディレクトリを配置
mkdir -p .agents/rules
mkdir -p .agents/bin
mkdir -p .antigravity
mkdir -p specs/features
mkdir -p src/types
mkdir -p src/repositories
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/components
mkdir -p tests/repositories
mkdir -p tests/components

# 3. .gitignore の更新
for entry in ".antigravity/" "backup.regista.*/"; do
  if ! grep -Fxq "$entry" .gitignore 2>/dev/null; then
    echo "$entry" >> .gitignore
  fi
done

echo "Clean-slate structure created. Backup preserved at $BACKUP_ROOT/"
