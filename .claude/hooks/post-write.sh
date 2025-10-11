#!/bin/bash
# Post-write hook for Meta Effect
# Auto-updates metadata when registry components change

set -e

# Get the file that was written
FILE="$1"

# Only process registry component files
if [[ "$FILE" =~ ^registry/effect-[^/]+/[^/]+\.ts$ ]]; then
  echo "📝 Registry component updated: $FILE"

  # Count lines
  lines=$(wc -l < "$FILE" | tr -d ' ')
  echo "   Lines: $lines"

  # Extract component type (effect-vite, effect-remix, etc.)
  component_type=$(echo "$FILE" | sed -E 's|registry/([^/]+)/.*|\1|')
  echo "   Type: $component_type"

  # Check line count
  if [ "$lines" -gt 100 ]; then
    echo "   ⚠️  Warning: Component has $lines lines (target: 50-100)"
  elif [ "$lines" -ge 50 ] && [ "$lines" -le 100 ]; then
    echo "   ✅ Good size: $lines lines"
  else
    echo "   ℹ️  Component has $lines lines (might be too small)"
  fi

  # Remind to update registry.json
  echo ""
  echo "📋 Remember to:"
  echo "   1. Update registry/registry.json if this is a new component"
  echo "   2. Update docs/specs/$component_type.md"
  echo "   3. Update README.md with new line counts"
fi

# If registry.json was updated, validate it
if [[ "$FILE" == "registry/registry.json" ]]; then
  echo "📋 Registry metadata updated"

  if jq empty "$FILE" 2>/dev/null; then
    echo "   ✅ Valid JSON"

    # Count components
    component_count=$(jq '.components | length' "$FILE")
    preset_count=$(jq '.presets | length' "$FILE")
    echo "   📦 Components: $component_count"
    echo "   🎁 Presets: $preset_count"
  else
    echo "   ❌ Invalid JSON!"
  fi
fi
