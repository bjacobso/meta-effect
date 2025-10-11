# RFC: effect-meta-cli - AST-Aware Codebase Explorer for LLMs

**Status**: Draft
**Author**: Community Proposal
**Date**: 2025-09-30

---

## Executive Summary

We propose **effect-meta-cli**, an AST-aware codebase exploration tool optimized for LLM consumption. It combines the power of `tree` with `ast-grep` queries to generate filtered, context-rich codebase snapshots.

### See It In Action

```sh
effect-meta-cli --input '
path: ./app/routes/preview
query:
  kind: function_declaration
  has:
    kind: call_expression
    field: function
    regex: "useAtom"
output: llm-context
' > preview-atoms.md
```

**Output**: A filtered directory tree showing only files with atom usage, complete with code snippets and metadata—ready to pipe into an LLM.

**Core Value**: Turn "show me all routes that use atoms" from a 10-minute manual exploration into a 2-second command.

**Key Innovation**: First tool to blend directory structure visualization with AST-based code filtering, optimized specifically for LLM context preparation.

---

## Problem Statement

### Current Pain Points

**1. Manual Codebase Exploration is Slow**
- Developers grep for patterns but lose directory context
- `tree` shows structure but not code semantics
- Finding "all components that use X pattern" requires multiple tools and mental gymnastics

**2. LLM Context Preparation is Manual and Error-Prone**
- Copy-pasting relevant files into prompts
- No systematic way to find related code
- Easy to miss important files or include irrelevant ones
- Context window limits force hard choices about what to include

**3. Existing Tools are Insufficient**
```sh
# Tree shows structure but not code patterns
tree app/routes/preview
# ❌ Can't filter by "routes that use atoms"

# Grep finds patterns but loses context
grep -r "useAtom" app/routes
# ❌ No directory structure, just file paths

# ast-grep finds code patterns but lacks visualization
ast-grep --pattern 'useAtom($$$)'
# ❌ No tree view, hard to understand relationships
```

**4. No LLM-Optimized Output**
- Existing tools output for humans, not LLMs
- No automatic context aggregation
- No format that's ready for `@file` syntax
- No metadata about code patterns found

### What Developers Actually Need

1. **AST-Aware Filtering**: "Show me files where X pattern exists"
2. **Structural Context**: "Keep the directory tree so I understand relationships"
3. **LLM-Ready Output**: "Format it so I can immediately use it with Claude/GPT"
4. **Composability**: "Let me pipe this into other tools"
5. **Pattern Library**: "Common queries should be one command"

---

## Proposed Solution

### effect-meta-cli Overview

A command-line tool that:
1. **Traverses** a directory tree (like `tree`)
2. **Filters** based on AST queries (via `ast-grep`)
3. **Outputs** in multiple formats (tree, JSON, markdown, LLM-context)
4. **Optimizes** for LLM consumption and developer workflows

### Core Capabilities

```sh
# Simple query
effect-meta-cli --query 'function_declaration' --path ./src

# YAML input (for complex queries)
effect-meta-cli --input '
path: ./src
depth: 3
query:
  kind: call_expression
  field: function
  regex: "ApiAtom\\.(query|mutation)"
output: llm-context
'

# Pattern library (prebuilt queries)
effect-meta-cli --pattern atoms --path ./app/routes/preview

# Pipe to LLM
effect-meta-cli --pattern atoms | pbcopy
# Then paste into Claude with: "Analyze these atom patterns"
```

### Integration Points

1. **CLI**: Standalone command-line tool
2. **MCP Server**: Model Context Protocol for Claude Desktop
3. **Claude Code Slash Command**: `/meta "show me all atoms"`
4. **VS Code Extension**: Tree view with AST filtering

---

## Core Features

### 1. AST-Grep Integration

Use `ast-grep` to filter files based on code patterns:

```yaml
# Find all Effect Atoms
query:
  kind: call_expression
  pattern: Atom.make($$$)

# Find all RouteAtom.searchParams
query:
  kind: call_expression
  pattern: RouteAtom.searchParams($$$)

# Find all API mutations
query:
  any:
    - pattern: ApiAtom.mutation($$$)
    - pattern: ApiAtom.query($$$)
```

### 2. Tree Visualization with Code Context

Output shows structure + code snippets:

```markdown
app/routes/preview/
├── clients/
│   └── route.tsx ⚛️ [3 atoms]
│       • searchParamsAtom (RouteAtom.searchParams)
│       • clientsListAtom (Atom.make)
│       • createClientAtom (ApiAtom.mutation)
├── tasks/
│   └── route.tsx ⚛️ [4 atoms]
│       • searchParamsAtom (RouteAtom.searchParams)
│       • tasksListAtom (Atom.make)
│       • createTaskAtom (ApiAtom.mutation)
│       • updateTaskAtom (ApiAtom.mutation)
└── placements/
    └── route.tsx ⚛️ [2 atoms]
        • placementsListAtom (Atom.make)
        • searchParamsAtom (RouteAtom.searchParams)
```

### 3. YAML/CLI Dual Interface

**CLI Arguments** (simple queries):
```sh
effect-meta-cli \
  --path ./app/routes \
  --query 'function_declaration' \
  --depth 3 \
  --output tree
```

**YAML Input** (complex queries):
```sh
effect-meta-cli --input '
path: ./app/routes/preview
depth: 5
query:
  all:
    - kind: import_statement
      has:
        field: source
        regex: "@effect-atom/atom-react"
    - kind: call_expression
      pattern: useAtom($$$)
output: llm-context
metadata:
  include_imports: true
  include_types: true
  max_snippet_lines: 10
'
```

### 4. Multiple Output Formats

**Tree Format** (human-readable):
```
app/routes/preview/
├── clients/route.tsx ⚛️ [3 atoms]
├── tasks/route.tsx ⚛️ [4 atoms]
└── placements/route.tsx ⚛️ [2 atoms]
```

**JSON Format** (programmatic):
```json
{
  "path": "app/routes/preview",
  "files": [
    {
      "path": "clients/route.tsx",
      "matches": [
        {
          "type": "Atom.make",
          "name": "clientsListAtom",
          "line": 15,
          "snippet": "const clientsListAtom = Atom.make(..."
        }
      ]
    }
  ]
}
```

**LLM Context Format** (@-file ready):
```markdown
# Codebase Context: Atom Patterns in /app/routes/preview

## Summary
- **Files Analyzed**: 3
- **Atoms Found**: 9
- **Pattern**: Atom.make, RouteAtom.searchParams, ApiAtom.mutation

## Files

### app/routes/preview/clients/route.tsx

**Atoms Found**: 3

```typescript
// Line 15-20
const searchParamsAtom = RouteAtom.searchParams({
  schema: Schema.Struct({
    page: Schema.optionalWith(Schema.NumberFromString, { default: () => 1 })
  })
});

// Line 25-35
const clientsListAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(searchParamsAtom);
    return yield* get.result(
      InternalApiAtom.query("clients", "list", {
        urlParams: params,
        reactivityKeys: ["clients-list"]
      })
    );
  })
);
```

### app/routes/preview/tasks/route.tsx
...
```

**Markdown Documentation** (for docs):
```markdown
# Preview Routes Architecture

## Atom Usage Patterns

All preview routes follow a consistent atom pattern:

1. **Search Params Atom** - URL state synchronization
2. **List Atom** - Data fetching with reactivity keys
3. **Mutation Atoms** - Create/update operations

### Files Using This Pattern
- `app/routes/preview/clients/route.tsx`
- `app/routes/preview/tasks/route.tsx`
- `app/routes/preview/placements/route.tsx`
```

### 5. Pattern Library

Prebuilt queries for common patterns:

```sh
# Find all atoms
effect-meta-cli --pattern atoms

# Find all Remix loaders
effect-meta-cli --pattern remix-loaders

# Find all Effect Schemas
effect-meta-cli --pattern effect-schemas

# Find all API endpoints
effect-meta-cli --pattern api-endpoints

# Custom pattern
effect-meta-cli --pattern custom:my-pattern.yaml
```

**Pattern Definition** (`patterns/atoms.yaml`):
```yaml
name: atoms
description: Find all Effect Atom definitions
query:
  any:
    - kind: call_expression
      pattern: Atom.make($$$)
    - kind: call_expression
      pattern: RouteAtom.searchParams($$$)
    - kind: call_expression
      pattern: RouteAtom.params($$$)
    - kind: call_expression
      pattern: ApiAtom.query($$$)
    - kind: call_expression
      pattern: ApiAtom.mutation($$$)
metadata:
  include_imports: true
  group_by: atom_type
```

---

## Use Cases with Examples

### Use Case 1: Find All Atoms in Preview Routes

**Command**:
```sh
effect-meta-cli --input '
path: ./app/routes/preview
pattern: atoms
output: llm-context
' > preview-atoms.md
```

**Use in Claude**:
```
@preview-atoms.md Analyze the atom patterns and suggest improvements
```

### Use Case 2: Find All Routes with Loaders

**Command**:
```sh
effect-meta-cli --input '
path: ./app/routes
query:
  kind: export_statement
  has:
    kind: function_declaration
    field: name
    regex: "loader"
output: tree
'
```

**Output**:
```
app/routes/
├── _app/
│   ├── analytics/_analytics.tsx 📊 [loader]
│   ├── clients/$id/_clients_show.tsx 📊 [loader]
│   └── tasks/_tasks.tsx 📊 [loader]
└── onboarding/
    └── new/_onboarding_new.tsx 📊 [loader]
```

### Use Case 3: Find All Effect Schema Definitions

**Command**:
```sh
effect-meta-cli --input '
path: ./app/schemas
query:
  kind: call_expression
  pattern: Schema.Struct($$$)
output: json
' | jq '.files[] | select(.matches | length > 5)'
```

**Use**: Find schemas with >5 fields (potentially needing splitting)

### Use Case 4: Find API Mutation Patterns

**Command**:
```sh
effect-meta-cli --input '
path: ./app/api
query:
  kind: call_expression
  pattern: Effect.tryPromise($$$)
depth: 5
output: llm-context
' > api-mutations.md
```

**Use in Claude**:
```
@api-mutations.md Review error handling patterns in mutations
```

### Use Case 5: Generate Architecture Documentation

**Command**:
```sh
effect-meta-cli --input '
path: ./app
query:
  kind: class_declaration
  has:
    kind: extends_clause
    regex: "Context\\.Tag"
output: markdown
' > services-architecture.md
```

**Output**: Markdown doc showing all Effect services (Context.Tag)

### Use Case 6: Find Components Using Specific Hooks

**Command**:
```sh
effect-meta-cli --input '
path: ./app/components
query:
  all:
    - kind: call_expression
      pattern: useAtomValue($$$)
    - kind: call_expression
      pattern: useAtomSet($$$)
output: tree
'
```

**Output**: Components using atom hooks

### Use Case 7: Prepare Context for Refactoring

**Scenario**: Refactor all routes to use new atom pattern

**Command**:
```sh
effect-meta-cli --input '
path: ./app/routes/_app
query:
  any:
    - pattern: useLoaderData($$$)
    - pattern: useFetcher($$$)
output: llm-context
include_related: true
' > refactor-context.md
```

**Use**:
```
@refactor-context.md Help me refactor these routes to use atoms instead of loaders
```

---

## Technical Architecture

### Input Processing

```typescript
// Parse CLI arguments OR YAML input
interface CliInput {
  path: string;
  query?: AstGrepQuery | string;
  pattern?: string;
  depth?: number;
  output?: OutputFormat;
  metadata?: MetadataConfig;
}

// Parse YAML
interface YamlInput {
  path: string;
  depth?: number;
  query: AstGrepQuery;
  output: OutputFormat;
  metadata?: MetadataConfig;
  include_related?: boolean;
}

type AstGrepQuery =
  | { kind: string; pattern?: string }
  | { all: AstGrepQuery[] }
  | { any: AstGrepQuery[] }
  | { not: AstGrepQuery };
```

### AST Parsing Pipeline

```typescript
class EffectMetaCli {
  async run(input: CliInput | YamlInput): Promise<Output> {
    // 1. Parse input
    const config = this.parseInput(input);

    // 2. Traverse directory tree
    const tree = await this.buildTree(config.path, config.depth);

    // 3. Filter with AST queries
    const filtered = await this.filterWithAst(tree, config.query);

    // 4. Enrich with metadata
    const enriched = await this.enrichWithMetadata(filtered, config.metadata);

    // 5. Format output
    const output = await this.formatOutput(enriched, config.output);

    return output;
  }

  private async filterWithAst(
    tree: FileTree,
    query: AstGrepQuery
  ): Promise<FilteredTree> {
    const results = [];

    for (const file of tree.files) {
      // Run ast-grep on file
      const matches = await astGrep.search(file.path, query);

      if (matches.length > 0) {
        results.push({
          path: file.path,
          matches: matches.map(m => ({
            type: this.inferPatternType(m),
            name: this.extractName(m),
            line: m.range.start.line,
            snippet: this.extractSnippet(file.content, m),
          }))
        });
      }
    }

    return { files: results };
  }

  private async formatOutput(
    data: EnrichedTree,
    format: OutputFormat
  ): Promise<string> {
    switch (format) {
      case 'tree':
        return this.formatAsTree(data);
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'markdown':
        return this.formatAsMarkdown(data);
      case 'llm-context':
        return this.formatForLlm(data);
    }
  }
}
```

### Tree Generation

```typescript
interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  matches?: AstMatch[];
  metadata?: {
    atomCount?: number;
    patternType?: string;
    imports?: string[];
  };
}

class TreeBuilder {
  build(path: string, depth: number): FileTreeNode {
    // Similar to `tree` but returns structured data
    // Stops at specified depth
    // Respects .gitignore
  }

  visualize(node: FileTreeNode, filtered: boolean = false): string {
    // Convert tree to ASCII art
    // Add icons based on metadata
    // Show match counts
  }
}
```

### Output Formatting

```typescript
class LlmFormatter {
  format(tree: EnrichedTree): string {
    return `
# Codebase Context: ${tree.pattern}

## Summary
- **Files Analyzed**: ${tree.totalFiles}
- **Matches Found**: ${tree.totalMatches}
- **Pattern**: ${tree.patternDescription}

## Files

${tree.files.map(f => this.formatFile(f)).join('\n\n')}

## Relationships

${this.generateRelationshipGraph(tree)}

## Suggested Questions for LLM
- How do these patterns relate to each other?
- Are there inconsistencies in usage?
- What refactoring opportunities exist?
`;
  }

  private formatFile(file: FileMatch): string {
    return `
### ${file.path}

**Matches Found**: ${file.matches.length}

${file.matches.map(m => `
\`\`\`typescript
// Line ${m.line}
${m.snippet}
\`\`\`
`).join('\n')}
`;
  }
}
```

### Caching Strategy

```typescript
class CacheManager {
  // Cache AST parse results
  private astCache = new Map<string, AstNode>();

  // Cache tree traversal
  private treeCache = new Map<string, FileTreeNode>();

  async getAst(filePath: string): Promise<AstNode> {
    const cached = this.astCache.get(filePath);
    if (cached && !this.isStale(filePath, cached)) {
      return cached;
    }

    const ast = await this.parseFile(filePath);
    this.astCache.set(filePath, ast);
    return ast;
  }

  private isStale(filePath: string, cached: any): boolean {
    // Check file modification time
    const stat = fs.statSync(filePath);
    return stat.mtimeMs > cached.timestamp;
  }
}
```

---

## Integration Points

### 1. MCP (Model Context Protocol) Server

Expose `effect-meta-cli` as an MCP tool that Claude Desktop can call:

```typescript
// mcp-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "effect-meta-cli",
  version: "0.1.0",
}, {
  capabilities: {
    tools: {},
  },
});

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "explore_codebase",
      description: "Explore codebase with AST-aware filtering",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          pattern: { type: "string" },
          query: { type: "string" },
          output: { type: "string", enum: ["tree", "llm-context"] }
        },
        required: ["path"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "explore_codebase") {
    const result = await effectMetaCli.run(request.params.arguments);
    return {
      content: [{ type: "text", text: result }]
    };
  }
});
```

**Usage in Claude Desktop**:
```
User: "Show me all atoms in the preview routes"

Claude: [Calls MCP tool]
{
  "name": "explore_codebase",
  "arguments": {
    "path": "./app/routes/preview",
    "pattern": "atoms",
    "output": "llm-context"
  }
}

[Receives context and analyzes]
```

### 2. Claude Code Slash Command

```typescript
// .conductor/commands/meta.ts
export default {
  name: "meta",
  description: "Explore codebase with AST queries",
  async execute(query: string) {
    // Parse natural language query
    const config = parseNaturalLanguageQuery(query);

    // Run effect-meta-cli
    const result = await effectMetaCli.run({
      path: config.path,
      pattern: config.pattern,
      output: "llm-context"
    });

    // Return as context
    return {
      type: "context",
      content: result
    };
  }
};
```

**Usage**:
```
/meta "show me all atoms in preview routes"
/meta "find routes with loaders"
/meta "show Effect schemas with >5 fields"
```

### 3. CLI Piping Workflows

```sh
# Find and analyze
effect-meta-cli --pattern atoms | \
  effect-meta analyze --type atom-patterns | \
  pbcopy

# Generate docs
effect-meta-cli --pattern services --output markdown > docs/services.md

# Find issues
effect-meta-cli --pattern error-handling | \
  grep "tryPromise" | \
  effect-meta suggest-improvements

# Chain with other tools
effect-meta-cli --pattern atoms --output json | \
  jq '.files[] | select(.matches | length > 10)' | \
  effect-meta visualize
```

### 4. VS Code Extension

```typescript
// vscode-extension/src/extension.ts
export function activate(context: vscode.ExtensionContext) {
  // Tree view provider
  const treeProvider = new EffectMetaTreeProvider();
  vscode.window.registerTreeDataProvider('effectMetaExplorer', treeProvider);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('effectMeta.findAtoms', async () => {
      const result = await effectMetaCli.run({
        path: vscode.workspace.rootPath,
        pattern: "atoms",
        output: "tree"
      });

      treeProvider.refresh(result);
    })
  );

  // Quick actions
  context.subscriptions.push(
    vscode.commands.registerCommand('effectMeta.quickQuery', async () => {
      const query = await vscode.window.showInputBox({
        prompt: "Enter AST query or pattern name"
      });

      // Run query and show results
    })
  );
}
```

---

## Implementation Roadmap

### Phase 1: Core CLI (2-3 months)

**Goal**: Working command-line tool

- [ ] Directory tree traversal with depth control
- [ ] AST-grep integration for pattern matching
- [ ] Tree output format
- [ ] JSON output format
- [ ] Basic pattern library (atoms, loaders, schemas)
- [ ] CLI argument parsing
- [ ] YAML input support
- [ ] File caching
- [ ] .gitignore support

**Deliverable**: `effect-meta-cli` binary

### Phase 2: LLM Optimization (1-2 months)

**Goal**: Optimize for LLM consumption

- [ ] LLM-context output format
- [ ] Markdown output format
- [ ] Relationship graph generation
- [ ] Automatic context summarization
- [ ] Snippet extraction with smart boundaries
- [ ] Import/type metadata
- [ ] Pattern inference (detect common patterns)
- [ ] Context size optimization

**Deliverable**: LLM-ready output formats

### Phase 3: MCP Integration (1 month)

**Goal**: Claude Desktop integration

- [ ] MCP server implementation
- [ ] Tool definition
- [ ] Natural language query parsing
- [ ] Error handling and validation
- [ ] Documentation

**Deliverable**: MCP server for Claude Desktop

### Phase 4: Claude Code Integration (1 month)

**Goal**: Slash command support

- [ ] Slash command implementation
- [ ] Query parser
- [ ] Context injection
- [ ] Result caching
- [ ] UI integration

**Deliverable**: `/meta` slash command

### Phase 5: Advanced Features (2-3 months)

**Goal**: Power user features

- [ ] VS Code extension
- [ ] Pattern creation UI
- [ ] Visual query builder
- [ ] Performance monitoring
- [ ] Multi-repo support
- [ ] Remote codebase support (GitHub API)
- [ ] Collaborative patterns (share queries)

**Deliverable**: Full ecosystem

---

## Detailed Examples

### Example 1: Onboarded Codebase - Find All Atoms

**Command**:
```sh
effect-meta-cli --input '
path: ./app
query:
  any:
    - pattern: Atom.make($$$)
    - pattern: RouteAtom.searchParams($$$)
    - pattern: RouteAtom.params($$$)
output: llm-context
depth: 10
metadata:
  include_imports: true
  include_types: true
'
```

**Output**:
```markdown
# Codebase Context: Atom Patterns in /app

## Summary
- **Files Analyzed**: 147
- **Atoms Found**: 23
- **Routes with Atoms**: 6

## Atom Distribution

### By Type
- `Atom.make`: 15 instances
- `RouteAtom.searchParams`: 6 instances
- `RouteAtom.params`: 2 instances

### By Directory
- `app/routes/preview/`: 18 atoms (6 files)
- `app/components/preview/shared/`: 5 atoms (3 files)

## Files

### app/routes/preview/clients/route.tsx

**Atoms**: 3

**Imports**:
```typescript
import { Atom, Result, useAtomValue } from "@effect-atom/atom-react";
import { InternalApiAtom } from "@/components/preview/shared/InternalApiAtom";
import { RouteAtom } from "@/components/preview/shared/RouteAtom";
```

**Atom Definitions**:

```typescript
// Line 39-49: Search params atom for filtering
const searchParamsAtom = RouteAtom.searchParams({
  schema: Schema.Struct({
    client_id: Schema.optional(Schema.String),
    employer_id: Schema.optional(Schema.String),
    page: Schema.optional(Schema.NumberFromString),
    per_page: Schema.optional(Schema.NumberFromString),
  }),
});

// Line 52-76: List atom with API integration
const clientsListAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const searchParams = get(searchParamsAtom);

    return yield* get.result(
      InternalApiAtom.query("clients", "list", {
        urlParams: {
          client_id: searchParams.client_id,
          employer_id: searchParams.employer_id,
          page: searchParams.page || 1,
          per_page: searchParams.per_page || 20,
        },
        reactivityKeys: ["clients-list", JSON.stringify(searchParams)],
      })
    );
  })
);
```

### app/routes/preview/tasks/route.tsx

[Similar structure...]

## Patterns Detected

1. **Consistent Pattern**: All preview routes follow:
   - Search params atom for URL state
   - List atom derived from search params
   - API query with reactivity keys

2. **Common Reactivity Keys**:
   - Resource-specific: `"clients-list"`, `"tasks-list"`
   - Parameter-based: `JSON.stringify(searchParams)`

3. **Potential Issues**:
   - ⚠️ Reactivity key collision possible in `tasks/route.tsx` (line 72)
   - 💡 Consider extracting common atom pattern to utility

## Suggested Follow-up Questions

1. Is the search params schema consistent across routes?
2. Should we create a factory function for list atoms?
3. Are there any atoms that should be global vs. route-specific?
```

### Example 2: Find All Effect Services

**Command**:
```sh
effect-meta-cli --input '
path: ./app
query:
  kind: class_declaration
  has:
    kind: extends_clause
    regex: "Context\\.Tag"
output: markdown
'
```

**Output**: Architecture documentation showing all services

### Example 3: Find Potential Refactoring Targets

**Command**:
```sh
effect-meta-cli --input '
path: ./app/routes
query:
  all:
    - kind: export_statement
      has:
        kind: function_declaration
        field: name
        regex: "loader"
    - not:
        kind: call_expression
        pattern: Effect.gen($$$)
output: llm-context
' > loader-refactor-targets.md
```

**Use**: Find loaders that don't use Effect (candidates for migration)

### Example 4: Pattern Library - Custom Patterns

**Create** `~/.effect-meta/patterns/custom-atoms.yaml`:
```yaml
name: custom-atoms
description: Find all custom atom patterns in our codebase
query:
  any:
    - pattern: Atom.make($$$)
    - pattern: RouteAtom.searchParams($$$)
    - pattern: RouteAtom.params($$$)
    - pattern: InternalApiAtom.query($$$)
    - pattern: InternalApiAtom.mutation($$$)
metadata:
  include_imports: true
  group_by: atom_type
  extract_schemas: true
post_process:
  - detect_patterns
  - suggest_improvements
```

**Use**:
```sh
effect-meta-cli --pattern custom:custom-atoms --path ./app
```

### Example 5: Integration with Other Tools

**Workflow**: Find atoms → Analyze with AI → Generate refactoring plan

```sh
# Step 1: Find all atoms
effect-meta-cli --pattern atoms --output llm-context > atoms.md

# Step 2: Send to Claude with specific prompt
cat atoms.md | claude --prompt "
Analyze these atom patterns and:
1. Identify inconsistencies
2. Suggest a standardized pattern
3. Generate refactoring steps
" > refactor-plan.md

# Step 3: Apply refactoring (with human review)
cat refactor-plan.md  # Review plan
# ... apply changes ...
```

---

## API Reference

### CLI Arguments

```
effect-meta-cli [options]

Options:
  -p, --path <path>          Directory to analyze (default: .)
  -q, --query <query>        AST-grep query string
  -P, --pattern <name>       Use predefined pattern
  -d, --depth <n>            Max directory depth (default: unlimited)
  -o, --output <format>      Output format: tree|json|markdown|llm-context
  -i, --input <yaml>         YAML configuration string
  -f, --file <path>          YAML configuration file
  -c, --cache                Enable caching (default: true)
  --no-cache                 Disable caching
  --verbose                  Verbose output
  --version                  Show version
  --help                     Show help
```

### YAML Configuration Schema

```yaml
# Required
path: string

# Optional
depth: number
query: AstGrepQuery
pattern: string
output: 'tree' | 'json' | 'markdown' | 'llm-context'

# Metadata
metadata:
  include_imports: boolean
  include_types: boolean
  include_comments: boolean
  max_snippet_lines: number
  group_by: 'file' | 'pattern' | 'atom_type'

# Post-processing
include_related: boolean
detect_patterns: boolean
suggest_improvements: boolean
```

### AST-Grep Query DSL

```yaml
# Simple pattern
query:
  pattern: Atom.make($$$)

# Kind-based
query:
  kind: function_declaration

# Regex matching
query:
  kind: call_expression
  field: function
  regex: "useAtom.*"

# Composite - ALL conditions
query:
  all:
    - pattern: Atom.make($$$)
    - has:
        kind: import_statement
        regex: "@effect-atom"

# Composite - ANY condition
query:
  any:
    - pattern: ApiAtom.query($$$)
    - pattern: ApiAtom.mutation($$$)

# Negation
query:
  not:
    pattern: Effect.gen($$$)
```

---

## Performance Considerations

### Caching Strategy

```typescript
interface CacheConfig {
  // Cache AST parse results (expensive)
  cacheAst: boolean;

  // Cache tree traversal
  cacheTree: boolean;

  // Cache pattern matching results
  cacheMatches: boolean;

  // TTL for cache entries
  cacheTtl: number; // milliseconds

  // Cache directory
  cacheDir: string; // ~/.effect-meta/cache
}
```

### Optimization Techniques

1. **Parallel Processing**: Process multiple files concurrently
2. **Incremental Parsing**: Only re-parse changed files
3. **Smart Filtering**: Filter by file extension before AST parsing
4. **Lazy Loading**: Load file contents only when needed
5. **Result Streaming**: Stream results as they're found

### Benchmarks (Expected)

```
Codebase: ~1000 TypeScript files

Without caching:
- First run: ~30s
- Pattern matching: ~5s per pattern
- Tree generation: ~2s

With caching:
- Subsequent runs: ~3s
- Pattern matching: ~500ms
- Tree generation: ~100ms
```

---

## Security Considerations

1. **File Access**: Respects `.gitignore` and file permissions
2. **Command Injection**: YAML input is parsed, never executed
3. **Output Sanitization**: Escape special characters in output
4. **Cache Security**: Cache stored in user directory with proper permissions
5. **Remote Access**: Optional flag to disable remote codebase support

---

## Future Enhancements

1. **Pattern Marketplace**: Share and discover patterns
2. **AI-Powered Pattern Generation**: "Show me files similar to X"
3. **Diff Mode**: Compare patterns between branches
4. **Watch Mode**: Re-run on file changes
5. **Web UI**: Visual query builder and result explorer
6. **GitHub Action**: Run as CI check
7. **Multi-Language Support**: Extend beyond TypeScript
8. **Custom AST Providers**: Pluggable AST parsers

---

## Conclusion

**effect-meta-cli** bridges the gap between code exploration and LLM-assisted development. By combining directory structure visualization with AST-aware filtering, it provides the exact context LLMs need to understand and help improve codebases.

**Key Innovations**:
- ✅ **AST-Aware Filtering**: Find patterns, not just strings
- ✅ **LLM-Optimized Output**: Ready for immediate use with Claude/GPT
- ✅ **Composable**: CLI → MCP → Slash Commands
- ✅ **Pattern Library**: Reusable queries for common tasks
- ✅ **Context Preservation**: Maintains directory structure while filtering

**This tool turns codebase exploration from a 10-minute manual process into a 2-second command.**

---

**Discussion**: [Effect Discord #tools](https://discord.gg/effect-ts)
**Repository**: TBD
**Status**: RFC - Open for feedback

---

_Last updated: 2025-09-30_
