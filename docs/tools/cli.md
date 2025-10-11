# Effect Meta CLI

[← Back to README](../../README.md)

## Overview

The Effect Meta CLI is an AST-aware codebase exploration tool optimized for LLM interactions. It provides intelligent filtering of code trees based on AST queries, making it perfect for both human developers and AI assistants to understand and navigate codebases.

## Core Concept

A tool that combines `tree` command functionality with `ast-grep` queries, hyper-optimized for LLM consumption via MCP (Model Context Protocol) or direct CLI usage.

## Usage Examples

### Basic Command

```sh
effect-meta-cli --query 'function_declaration' --path './src' --depth 3
```

### YAML Input Format

```sh
effect-meta-cli --input '
path: ./src
query: function_declaration
depth: 3
'
```

### Advanced AST Queries

```sh
effect-meta-cli --input '
path: ./src
depth: 3
astgrep:
  # DSL easy for humans and LLMs
  function_declaration:
    - pattern: "export function $NAME"
    - has:
        kind: return_statement
  arrow_function:
    - pattern: "const $NAME = ($PARAMS) => $BODY"
'
```

## Output Formats

### Tree Format (Default)

```markdown
.
├── src
│   ├── index.ts [exports: 3, functions: 5]
│   ├── components
│   │   ├── Button.tsx [exports: 1, components: 1]
│   │   └── Modal.tsx [exports: 2, components: 1, hooks: 2]
│   └── utils
│       ├── helpers.ts [exports: 10, functions: 10]
│       └── validators.ts [exports: 5, functions: 5]
└── tests
    ├── index.test.ts [tests: 5, describes: 2]
    └── utils.test.ts [tests: 8, describes: 3]
```

### JSON Format

```json
{
  "path": "./src",
  "stats": {
    "totalFiles": 7,
    "matchedNodes": 42,
    "exports": 21,
    "functions": 26
  },
  "tree": {
    "src": {
      "index.ts": {
        "exports": 3,
        "functions": 5,
        "matches": [...]
      }
    }
  }
}
```

## LLM Integration

### Piping to Claude

```sh
effect-meta-cli --input '
path: ./src
depth: 3
astgrep:
  function_declaration: true
  arrow_function: true
' | claude --prompt "@ + analyze the architecture of this codebase"
```

### Slash Command Integration

Hide the CLI behind a Claude Code slash command:

```
/meta "show me all the Effect services in this codebase"
```

This would expand to:

```sh
effect-meta-cli --input '
path: .
astgrep:
  pattern: "class $NAME extends Service.Tag"
' | claude-context
```

## Advanced Features

### Multi-Pattern Queries

```yaml
path: ./src
queries:
  - name: "Effect Services"
    pattern: "class $_ extends Service.Tag"
  - name: "HTTP Routes"
    pattern: "HttpRouter.$METHOD"
  - name: "Schema Definitions"
    pattern: "Schema.Struct"
```

### Context-Aware Filtering

```yaml
path: ./src
context:
  includeImports: true
  includeExports: true
  includeTypes: true
  maxLineLength: 120
  excludeTests: true
```

### Smart Summarization

The CLI can provide intelligent summaries optimized for LLM context:

```sh
effect-meta-cli --summarize --input '
path: ./src
maxTokens: 4000
focus: ["routing", "services", "schemas"]
'
```

Output:
```markdown
## Codebase Summary

### Architecture
- Service-oriented with 12 Effect services
- RESTful API with 24 endpoints
- Schema-first validation using Effect Schema

### Key Components
1. **Services** (./src/services/)
   - UserService: Authentication and user management
   - DataService: Database operations
   - CacheService: Redis caching layer

2. **Routes** (./src/routes/)
   - /api/users: User CRUD operations
   - /api/posts: Content management
   - /api/admin: Administrative functions

3. **Schemas** (./src/schemas/)
   - 15 domain models
   - Request/response validation schemas
   - Database entity schemas
```

## Implementation Details

### AST Patterns

The CLI supports various AST query patterns:

```yaml
# Function declarations
function_declaration:
  pattern: "function $NAME($_) { $_ }"

# Effect definitions
effect_usage:
  pattern: "Effect.$METHOD"

# Service definitions
service_class:
  pattern: |
    class $NAME extends Service.Tag<$NAME>()(
      "$NAME",
      $_
    )

# Schema definitions
schema_struct:
  pattern: "Schema.Struct({ $_ })"
```

### Performance Optimizations

- Parallel AST parsing for large codebases
- Incremental parsing with caching
- Streaming output for real-time processing
- Memory-efficient tree walking

## Configuration

### Global Config

```yaml
# ~/.effect-meta/cli.config.yaml
defaults:
  depth: 3
  excludePatterns:
    - node_modules
    - dist
    - .git
  outputFormat: tree

presets:
  services:
    pattern: "class $_ extends Service.Tag"
  routes:
    pattern: "HttpRouter.$_"
  schemas:
    pattern: "Schema.Struct"
```

### Project Config

```yaml
# .effect-meta.yaml
project:
  name: "My Effect App"
  conventions:
    services: "./src/services/**/*.ts"
    routes: "./src/routes/**/*.ts"
    schemas: "./src/schemas/**/*.ts"
```

## Use Cases

### 1. Codebase Exploration

```sh
# Find all Effect services
effect-meta-cli --pattern "extends Service.Tag"

# Find all HTTP endpoints
effect-meta-cli --pattern "HttpRouter.(get|post|put|delete)"

# Find all Schema definitions
effect-meta-cli --pattern "Schema.Struct"
```

### 2. Documentation Generation

```sh
# Generate service documentation
effect-meta-cli --doc-mode services > docs/services.md

# Generate API documentation
effect-meta-cli --doc-mode routes > docs/api.md
```

### 3. Refactoring Support

```sh
# Find all uses of a deprecated pattern
effect-meta-cli --pattern "old.deprecated.method"

# Find candidates for extraction
effect-meta-cli --pattern "function $NAME" --min-lines 50
```

### 4. AI Assistant Context

```sh
# Provide focused context for AI coding assistants
effect-meta-cli --ai-context --focus "authentication" |
  ai-assistant "implement password reset flow"
```

## Future Enhancements

- **Interactive Mode**: TUI for browsing and filtering
- **Watch Mode**: Real-time updates as code changes
- **Semantic Search**: Natural language queries
- **Cross-Reference Analysis**: Show relationships between components
- **Metrics Dashboard**: Code quality and complexity metrics
- **Plugin System**: Extend with custom analyzers

## Related Documents

- [Worktree Management](worktree.md) - Git worktree integration
- [CLI RFC](../rfcs/cli-rfc.md) - Complete technical specification