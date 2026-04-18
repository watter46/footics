#!/bin/bash

# quality-harness/scripts/pre-deliver.sh
# 報告前の最終クリーンアップ・チェック

echo "🧹 Running Pre-deliver Health Check..."

EXIT_CODE=0

# 1. console.log のチェック（意図的なものを除く）
echo "🔍 Checking for console.log..."
LOGS=$(grep -rn "console.log" src/ extension/ video-canvas/ --exclude-dir=node_modules | grep -v "shared/logger" | grep -v "// ignore-log")
if [ ! -z "$LOGS" ]; then
    echo "⚠️ Found console.log in the following files:"
    echo "$LOGS"
    # これを失敗とするかは運用次第だが、警告として出す
else
    echo "✅ No console.log found."
fi

# 2. TODO/FIXME のチェック
echo "🔍 Checking for TODO/FIXME..."
TODOS=$(grep -rnE "TODO|FIXME" src/ extension/ video-canvas/ --exclude-dir=node_modules)
if [ ! -z "$TODOS" ]; then
    echo "⚠️ Found TODO/FIXME comments:"
    echo "$TODOS"
else
    echo "✅ No TODO/FIXME found."
fi

# 3. 未使用の export/import は Biome が check --write で消してくれているはずだが
# 型エラーが残っていないかを最終確認
echo "🔍 Running final type-check across all packages..."
pnpm -r type-check
if [ $? -ne 0 ]; then
    echo "❌ Semantic errors found! Fix them before delivery."
    EXIT_CODE=1
else
    echo "✅ No semantic errors found."
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "🏁 Health check PASSED. Ready for delivery!"
else
    echo "🛑 Health check FAILED. Please cleanup your code."
fi

exit $EXIT_CODE
