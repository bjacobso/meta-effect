#!/bin/bash
# Component Template Generator
# Helper for creating new Meta Effect components

# Usage: .claude/hooks/component-template.sh effect-vite my-component "Description"

set -e

COMPONENT_TYPE=$1
COMPONENT_NAME=$2
DESCRIPTION=$3

if [ -z "$COMPONENT_TYPE" ] || [ -z "$COMPONENT_NAME" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage: component-template.sh <type> <name> <description>"
  echo ""
  echo "Examples:"
  echo "  component-template.sh effect-vite api-client 'HTTP client for Effect APIs'"
  echo "  component-template.sh effect-remix async-loader 'Parallel data loading helper'"
  echo ""
  echo "Valid types: effect-vite, effect-remix, effect-htmx"
  exit 1
fi

TARGET_DIR="registry/$COMPONENT_TYPE"
TARGET_FILE="$TARGET_DIR/$COMPONENT_NAME.ts"

# Check if directory exists
if [ ! -d "$TARGET_DIR" ]; then
  echo "❌ Error: Directory $TARGET_DIR does not exist"
  echo "Valid types: effect-vite, effect-remix, effect-htmx"
  exit 1
fi

# Check if file already exists
if [ -f "$TARGET_FILE" ]; then
  echo "❌ Error: Component already exists: $TARGET_FILE"
  exit 1
fi

# Generate component file
cat > "$TARGET_FILE" << EOF
/**
 * ${COMPONENT_NAME^} Component
 *
 * $DESCRIPTION
 *
 * @example
 * \`\`\`ts
 * // Import the component
 * import { ${COMPONENT_NAME//-/} } from './lib/$COMPONENT_TYPE/$COMPONENT_NAME'
 *
 * // Usage example - replace with actual usage
 * const result = ${COMPONENT_NAME//-/}({ ... })
 * \`\`\`
 *
 * Copy this file into your project and customize for your needs.
 */

import { Effect } from 'effect'

// TODO: Add your implementation here (~50-100 lines)

export function ${COMPONENT_NAME//-/}() {
  return Effect.succeed("Hello from $COMPONENT_NAME")
}
EOF

echo "✅ Created component: $TARGET_FILE"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Implement the component (keep to ~50-100 lines)"
echo ""
echo "2. Add to registry/registry.json:"
echo '   {'
echo '     "name": "'"$COMPONENT_NAME"'",'
echo '     "type": "'"$COMPONENT_TYPE"'",'
echo '     "description": "'"$DESCRIPTION"'",'
echo '     "files": ["'"$COMPONENT_TYPE/$COMPONENT_NAME.ts"'"],'
echo '     "dependencies": ["effect"],'
echo '     "tags": ["TODO"]'
echo '   }'
echo ""
echo "3. Update docs/specs/$COMPONENT_TYPE.md"
echo ""
echo "4. Update README.md with new component and line counts"
echo ""
echo "5. Test by copying into a real project"
