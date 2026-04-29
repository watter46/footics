#!/bin/bash

# quality-harness/scripts/verify-affected.sh
# 影響範囲に限定して検証を実行する

ROOT_DIR=$(git rev-parse --show-toplevel)
CHECK_ALL=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --all) CHECK_ALL=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

if [ "$CHECK_ALL" = true ]; then
    echo "🔍 Running verification for ALL packages..."
    pnpm verify
    exit $?
fi

# 変更されたファイルを特定
CHANGED_FILES=$(git diff --name-only HEAD)

if [ -z "$CHANGED_FILES" ]; then
    echo "✅ No changes detected in git. Running quick root check..."
    pnpm check
    exit $?
fi

# 変更が含まれるパッケジを抽出
PACKAGES=()
if echo "$CHANGED_FILES" | grep -qvE "^(extension/|video-canvas/)"; then
    PACKAGES+=("footics") # root package
fi
if echo "$CHANGED_FILES" | grep -q "^extension/"; then
    PACKAGES+=("footics-extension")
fi
if echo "$CHANGED_FILES" | grep -q "^video-canvas/"; then
    PACKAGES+=("video-canvas-extension")
fi

echo "📦 Affected packages: ${PACKAGES[*]}"

EXIT_CODE=0

for pkg in "${PACKAGES[@]}"; do
    echo "🚀 Verifying package: $pkg..."
    
    # パスと検証コマンドの決定
    case $pkg in
        "footics")
            PKG_DIR="."
            VERIFY_CMD="pnpm check && pnpm type-check"
            ;;
        "footics-extension")
            PKG_DIR="extension"
            VERIFY_CMD="pnpm biome check --write $PKG_DIR && pnpm --filter $pkg type-check"
            ;;
        "video-canvas-extension")
            PKG_DIR="video-canvas"
            VERIFY_CMD="pnpm biome check --write $PKG_DIR && pnpm --filter $pkg type-check"
            ;;
    esac

    echo "Running: $VERIFY_CMD"
    eval $VERIFY_CMD
    
    if [ $? -ne 0 ]; then
        EXIT_CODE=1
        echo "❌ Verification failed for $pkg"
    else
        echo "✨ Verification passed for $pkg"
    fi
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 All affected packages passed verification!"
else
    echo "⚠️ Some packages failed verification. Please check the logs."
fi

exit $EXIT_CODE
