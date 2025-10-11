#!/bin/bash
# Pre-commit hook for Meta Effect
# Validates registry components and updates metadata

set -e

echo "🔍 Meta Effect Pre-Commit Checks..."

# Check if registry files changed
if git diff --cached --name-only | grep -q "^registry/"; then
  echo "📦 Registry changes detected..."

  # Validate registry.json is valid JSON
  if git diff --cached --name-only | grep -q "registry/registry.json"; then
    echo "  Validating registry.json..."
    if ! jq empty registry/registry.json 2>/dev/null; then
      echo "❌ Error: registry.json is not valid JSON"
      exit 1
    fi
    echo "  ✅ registry.json is valid"
  fi

  # Check component line counts
  for file in $(git diff --cached --name-only | grep "^registry/effect-.*/.*.ts$"); do
    if [ -f "$file" ]; then
      lines=$(wc -l < "$file" | tr -d ' ')
      echo "  📏 $file: $lines lines"

      # Warn if over 100 lines
      if [ "$lines" -gt 100 ]; then
        echo "  ⚠️  Warning: Component exceeds 100 lines (has $lines)"
        echo "     Consider splitting into smaller components"
      fi

      # Check for header documentation
      if ! head -n 5 "$file" | grep -q "^ \* "; then
        echo "  ❌ Error: Missing header documentation in $file"
        echo "     Components must have /** ... */ header with @example"
        exit 1
      fi
      echo "  ✅ Has header documentation"
    fi
  done
fi

# Check if README.md was updated when registry changed
if git diff --cached --name-only | grep -q "^registry/effect-.*/.*.ts$"; then
  if ! git diff --cached --name-only | grep -q "README.md"; then
    echo "⚠️  Warning: Registry components changed but README.md not updated"
    echo "   Consider updating component lists and line counts"
  fi
fi

echo "✅ All pre-commit checks passed!"
