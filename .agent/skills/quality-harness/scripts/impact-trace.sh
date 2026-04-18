#!/bin/bash

# quality-harness/scripts/impact-trace.sh
# indexing-awareness を利用した影響範囲の特定

TARGET=$1

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <file-path-or-symbol>"
    exit 1
fi

INDEX_SCRIPT=".agent/skills/indexing-awareness/scripts/trace-dependencies.sh"

if [ ! -f "$INDEX_SCRIPT" ]; then
    echo "❌ indexing-awareness skill not found. Please ensure it is installed."
    exit 1
fi

echo "🔍 Analyzing impact of: $TARGET"
chmod +x "$INDEX_SCRIPT"
"$INDEX_SCRIPT" "$TARGET"

echo ""
echo "💡 Above are the Forward/Reverse dependencies. Ensure to verify 'Reverse Dependencies' manually or run tests if applicable."
