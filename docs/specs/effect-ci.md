# effect-ci Specification

**Status**: Ready
**Components**: See [`registry/effect-ci/`](../../registry/effect-ci/)
**Last Updated**: 2025-10-17

## Overview

`effect-ci` is a collection of vendorable components (~880 lines total) for building typed CI/CD pipelines with Effect CLI, Effect Platform Command, and Effect Schema. These aren't GitHub Actions - they're TypeScript programs you run locally or in CI that compose shell commands (git, gh, claude) into strongly-typed pipelines.

Think "prompts on steroids" - typed, testable, composable automation scripts.

**Components**:
- Release automation (~400 lines): types, shell-runner, transforms, release-plan
- DAG workflows (~480 lines): dag-types, dag-validation, dag-builder, dag-config

## Core Primitives

### 1. Shell Runners (Pure Effect Commands)

Typed wrappers around CLI tools using `@effect/platform/Command`:

```typescript
import { Git, GH, Claude } from './lib/effect-ci/shell-runner'
import { Effect } from 'effect'

const program = Effect.gen(function*() {
  // Get default branch
  const branch = yield* GH.defaultBranch()

  // Fetch commits from last week
  const commits = yield* Git.logSince(branch, "2025-10-10T00:00:00Z")

  // Ask Claude to summarize
  const summary = yield* Claude.ask("claude-3-5-sonnet-latest", "Summarize...")
})
```

**Available Commands**:
- `Git.logSince(branch, sinceIso, untilIso?)` - Get commits as TSV
- `Git.fetch(remote, branch)` - Fetch from remote
- `GH.defaultBranch()` - Get repo default branch name
- `GH.mergedPRsSince(base, sinceIso, limit?)` - Get merged PRs as JSON
- `GH.createRelease(tag, title, notesFile)` - Create GitHub release
- `GH.editRelease(tag, title, notesFile)` - Update existing release
- `GH.uploadReleaseAsset(tag, file)` - Upload asset to release
- `GH.releaseExists(tag)` - Check if release exists
- `Claude.ask(model, prompt)` - Ask Claude via CLI (or swap with API)

### 2. Effect Schema Types

Strongly-typed data contracts for CI/CD:

```typescript
import { Commit, PR, ReleaseJSON } from './lib/effect-ci/types'
import { Schema as S } from 'effect'

// Parse commits with validation
const commits = S.decodeUnknownSync(S.Array(Commit))(rawData)

// Type-safe release JSON
const release: ReleaseJSON = {
  window: { since: "2025-10-10T00:00:00Z", until: "2025-10-17T00:00:00Z" },
  highlights: ["First-class TypeScript support"],
  customer_impact: ["Users can now write typed CI pipelines"],
  features: [{ title: "Effect CLI", summary: "Added CLI support", owner: "@team" }],
  improvements: [],
  fixes: [],
  breaking_changes: [],
  deprecations: [],
  rollout_risks: [],
  metrics_kpis: [],
  owners: [{ name: "Ben", team: "Platform" }],
  changelog: [
    { id: "#123", type: "PR", title: "Add Effect CLI", url: "...", author: "ben", mergedAt_or_date: "2025-10-15T12:00:00Z" }
  ]
}
```

**Schema Types**:
- `ISODateTime` - ISO 8601 datetime string with brand
- `Commit` - Git commit from `git log`
- `PR` - GitHub PR from `gh pr list --json`
- `ChangelogItem` - Unified changelog entry (PR or commit)
- `ReleaseJSON` - Machine-readable release notes with all fields

### 3. Transform Utilities

Pure functions for pipeline data processing:

```typescript
import * as T from './lib/effect-ci/transforms'

// Parse shell outputs
const commits = T.parseCommits(gitLogTsv)
const prs = T.parsePRs(ghPrJson)

// Deduplicate commits covered by PRs
const unique = T.dedupe(commits, prs)

// Filter by labels
const userFacing = T.filterByLabels(prs, ["user-facing", "bug"])

// Limit results
const limited = T.limit(50)(unique)

// Build LLM prompt with strict format markers
const prompt = T.buildPrompt({ repo, since, until, prs, commits })

// Extract Markdown and JSON blocks from Claude response
const { md, json } = T.extractBlocks(claudeResponse)
```

**Transform Functions**:
- `parseCommits(tsv)` - Parse `git log` TSV output
- `parsePRs(json)` - Parse `gh pr list` JSON output
- `dedupe(commits, prs)` - Remove commits represented by PRs
- `filterByLabels(prs, labels)` - Filter PRs by label names
- `limit(n)` - Take first N items (curried)
- `buildPrompt(ctx)` - Build LLM prompt with `<<<MARKDOWN>>>` / `<<<JSON>>>` markers
- `extractBlocks(txt)` - Extract Markdown and JSON from LLM response

### 4. Release Plan CLI

Effect CLI program with composable plan DSL:

```typescript
import { ReleasePlan, runPlan } from './lib/effect-ci/release-plan'

const weeklyPlan: ReleasePlan = {
  name: "weekly-release",
  window: { kind: "lastDays", days: 7 },
  model: "claude-3-5-sonnet-latest",
  maxChangelog: 70,
  labelFilter: ["user-facing"],  // Optional
  output: {
    toMarkdownFile: "release_notes.md",
    toJsonFile: "release_notes.json",
    toGithubRelease: (d) => ({
      tag: `weekly-${d.toISOString().slice(0, 10)}`,
      title: `Weekly Release Notes – ${d.toISOString().slice(0, 10)}`
    })
  }
}

// Run with Effect
Effect.runPromise(runPlan(weeklyPlan))
```

### 5. DAG Workflow Configuration

Typed CI/CD workflow definitions with validation (~480 lines total across 4 files):

#### dag-types.ts (~136 lines)

Core Effect Schema types for workflow primitives:

```typescript
import { task, gate, fanout, fanin, edge } from './lib/effect-ci/dag-types'
import type { TaskNode, GateNode, FanoutNode, FaninNode } from './lib/effect-ci/dag-types'

// Node types with branded IDs
const checkoutNode: TaskNode = {
  _tag: "task",
  id: "checkout" as NodeId,
  uses: "actions/checkout@v4",
  env: { CI: "true" }
}

const gateNode: GateNode = {
  _tag: "gate",
  id: "only_main" as NodeId,
  condition: "github.ref == 'refs/heads/main'"
}

const fanoutNode: FanoutNode = {
  _tag: "fanout",
  id: "parallel_builds" as NodeId
}
```

**Type Definitions**:
- `NodeId` - Branded string for node identifiers
- `TaskNode` - Run shell command or use action (validates uses XOR run)
- `GateNode` - Conditional execution gate
- `FanoutNode` - Trigger parallel execution branches
- `FaninNode` - Wait for parallel branches to complete
- `Edge` - Connection between nodes with optional condition
- `Trigger` - Push/PR/Schedule workflow triggers
- `RetryPolicy` - Retry configuration with exponential backoff

#### dag-builder.ts (~90 lines)

Ergonomic builder functions for constructing workflows:

```typescript
import { task, gate, fanout, fanin, edge } from './lib/effect-ci/dag-builder'

const nodes = [
  task("checkout", { uses: "actions/checkout@v4" }),
  gate("only_main", "github.ref == 'refs/heads/main'"),
  fanout("parallel_builds"),
  task("build_web", { run: "pnpm build --filter web" }),
  task("build_api", { run: "pnpm build --filter api" }),
  task("test_api", {
    run: "pnpm test:api",
    env: { CI: "true" },
    retry: { maxAttempts: 3 }
  }),
  fanin("join_builds"),
  task("release", {
    run: "pnpm release",
    secrets: ["NPM_TOKEN"]
  }),
]

const edges = [
  edge("checkout", "only_main"),
  edge("only_main", "parallel_builds", "expr"),
  edge("parallel_builds", "build_web"),
  edge("parallel_builds", "build_api"),
  edge("build_api", "test_api"),
  edge("build_web", "join_builds"),
  edge("test_api", "join_builds"),
  edge("join_builds", "release"),
]
```

**Builder Functions**:
- `task(id, config)` - Create task node (run or uses)
- `gate(id, condition)` - Create conditional gate
- `fanout(id)` - Create parallel fanout
- `fanin(id)` - Create parallel join
- `edge(from, to, condition?)` - Create node connection

#### dag-validation.ts (~173 lines)

Pure validation functions for DAG correctness:

```typescript
import { validateDAG } from './lib/effect-ci/dag-validation'
import { Effect } from 'effect'

const result = await Effect.runPromise(
  validateDAG({ nodes, edges })
)
// Returns validated config or ParseResult errors
```

**Validation Functions**:
- `validateEdgeReferences()` - All edges reference existing nodes
- `validateNoSelfLoops()` - No node -> node edges
- `validateGateConditions()` - Gate nodes can't have "never" condition
- `validateNoCycles()` - DFS cycle detection
- `validateDAG()` - Run all validations in sequence

#### dag-config.ts (~135 lines)

Main orchestration with JSON/YAML serialization:

```typescript
import { DagConfig, parseDAG, parseDAGSync } from './lib/effect-ci/dag-config'
import { task, gate, edge } from './lib/effect-ci/dag-builder'
import YAML from 'yaml'

const dag = {
  name: "build_and_release",
  version: "1.0.0",
  triggers: [{ _tag: "push", branches: ["main"] }],
  defaults: {
    retry: { maxAttempts: 3 },
    env: { NODE_ENV: "production" }
  },
  nodes: [
    task("checkout", { uses: "actions/checkout@v4" }),
    gate("only_main", "github.ref == 'refs/heads/main'"),
    task("build", { run: "pnpm build" }),
  ],
  edges: [
    edge("checkout", "only_main"),
    edge("only_main", "build", "expr"),
  ]
}

// Sync parsing (throws on error)
const parsed = parseDAGSync(dag)

// Effect parsing (better error handling)
const program = parseDAG(dag).pipe(
  Effect.tap(() => Effect.log("DAG validated")),
  Effect.map(validated => ({
    json: JSON.stringify(validated, null, 2),
    yaml: YAML.stringify(validated)
  }))
)
```

**API Functions**:
- `parseDAG(unknown)` - Effect-based validation
- `parseDAGSync(unknown)` - Sync validation (throws)
- `encodeDAG(DagConfig)` - Encode back to plain object
- `exampleDAG` - Full example DAG configuration

**CLI Commands**:

```bash
# Run locally with default 7-day window
npx tsx lib/effect-ci/release-plan.ts run

# Custom date range
npx tsx lib/effect-ci/release-plan.ts run \
  --since 2025-10-10T00:00:00Z \
  --until 2025-10-17T00:00:00Z

# Dry run (preview without side effects)
npx tsx lib/effect-ci/release-plan.ts run --dry-run

# Generate GitHub Actions workflow YAML
npx tsx lib/effect-ci/release-plan.ts emit-workflow > .github/workflows/weekly.yml
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Local Dev / CI Runner                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Effect CLI (release-plan.ts)            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  ReleasePlan {                                       │  │
│  │    window: { lastDays: 7 }                           │  │
│  │    model: "claude-3-5-sonnet-latest"                 │  │
│  │    labelFilter: ["user-facing"]                      │  │
│  │    output: {                                          │  │
│  │      toMarkdownFile: "release_notes.md"              │  │
│  │      toJsonFile: "release_notes.json"                │  │
│  │      toGithubRelease: (d) => ({ tag, title })        │  │
│  │    }                                                  │  │
│  │  }                                                    │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Pipeline Execution                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  1. GH.defaultBranch()                               │  │
│  │     → "main"                                          │  │
│  │                                                       │  │
│  │  2. Git.fetch("origin", "main")                      │  │
│  │                                                       │  │
│  │  3. GH.mergedPRsSince("main", sinceIso)             │  │
│  │     → JSON array of PRs                              │  │
│  │                                                       │  │
│  │  4. Git.logSince("main", sinceIso, untilIso)        │  │
│  │     → TSV lines of commits                           │  │
│  │                                                       │  │
│  │  5. Transform.parsePRs(json)                         │  │
│  │     Transform.parseCommits(tsv)                      │  │
│  │     Transform.dedupe(commits, prs)                   │  │
│  │     Transform.filterByLabels(prs, labels)            │  │
│  │                                                       │  │
│  │  6. Transform.buildPrompt(ctx)                       │  │
│  │     → Prompt with <<<MARKDOWN>>>/<<<JSON>>> markers  │  │
│  │                                                       │  │
│  │  7. Claude.ask(model, prompt)                        │  │
│  │     → Response with delimited blocks                 │  │
│  │                                                       │  │
│  │  8. Transform.extractBlocks(response)                │  │
│  │     Schema.decode(ReleaseJSON)(json)                 │  │
│  │     → { md: string, json: ReleaseJSON }              │  │
│  │                                                       │  │
│  │  9. FileSystem.writeFile(mdFile, md)                 │  │
│  │     FileSystem.writeFile(jsonFile, json)             │  │
│  │                                                       │  │
│  │  10. GH.createRelease(tag, title, mdFile)            │  │
│  │      GH.uploadReleaseAsset(tag, jsonFile)            │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Outputs                           │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  • release_notes.md (human-readable)                 │  │
│  │  • release_notes.json (machine-readable)             │  │
│  │  • GitHub Release (weekly-2025-10-17)                │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Why Effect CLI?

- **Typed Arguments**: Options and args validated with Effect Schema
- **Composable Commands**: Subcommands compose naturally
- **Help Generation**: Auto-generated help text from types
- **Effect Integration**: CLI handlers are Effect programs

### 2. Why Platform Command?

- **Pure Effects**: All shell commands return `Effect<Output, Error, Dependencies>`
- **No execa/child_process**: Stay in Effect ecosystem
- **Testable**: Mock shell commands with Layer substitution
- **Typed Errors**: Command failures typed as Effect errors

### 3. Why Vendorable?

- **Customizable**: Users modify prompt templates, filters, outputs
- **No Black Box**: All logic visible in ~400 lines
- **No npm Updates**: Copy once, own forever
- **Educational**: Learn Effect CLI + Command + Schema patterns

### 4. Why Claude Integration?

- **Business-Friendly**: Transform git/PR data into readable release notes
- **Structured Output**: `<<<MARKDOWN>>>` / `<<<JSON>>>` markers for reliable parsing
- **Validated JSON**: Effect Schema ensures Claude output matches `ReleaseJSON` type
- **Swappable**: Replace `Claude.ask` with direct API calls or other LLMs

## Implementation Status

### ✅ Implemented
- All 4 release automation components (~400 lines)
  - Effect CLI with `run` and `emit-workflow` commands
  - Shell runners for git/gh/claude
  - Transform utilities (parse, dedupe, filter, prompt, extract)
  - Effect Schema types (Commit, PR, ReleaseJSON)
  - Weekly release plan example
- All 4 DAG workflow components (~480 lines)
  - dag-types.ts - Node, Edge, Trigger schemas
  - dag-validation.ts - Cycle detection, reference validation
  - dag-builder.ts - Ergonomic builder helpers
  - dag-config.ts - Main DagConfig with JSON/YAML support

### 🚧 Planned Enhancements
- **Release Automation**:
  - Monorepo bucketing (group PRs by `apps/*` vs `packages/*`)
  - Slack/Teams notification output
  - Multi-repo aggregation (combine PRs from multiple repos)
  - Label-based approval guards (require `release:approved` label)
  - Custom LLM provider adapters (OpenAI, Gemini, etc.)
- **DAG Workflows**:
  - DAG executor runtime (run workflows locally)
  - GitHub Actions YAML emitter (convert DAG to .yml)
  - Workflow visualization (Mermaid/Graphviz output)
  - DAG composition (embed sub-DAGs)
  - Conditional edge expressions (JSX-like syntax)

## Example Application Structure

```
my-project/
├── lib/
│   └── effect-ci/              # Vendored components
│       ├── types.ts            # Release schema types (60 lines)
│       ├── shell-runner.ts     # Command wrappers (140 lines)
│       ├── transforms.ts       # Transform utilities (130 lines)
│       ├── release-plan.ts     # CLI program + DSL (180 lines)
│       ├── dag-types.ts        # DAG schema types (136 lines)
│       ├── dag-validation.ts   # DAG validation (173 lines)
│       ├── dag-builder.ts      # DAG builder helpers (90 lines)
│       └── dag-config.ts       # DAG config + examples (135 lines)
├── workflows/
│   └── build-and-release.ts   # Custom DAG definitions
├── .github/
│   └── workflows/
│       └── weekly-release.yml # Generated from emit-workflow
└── package.json
```

## Usage Examples

### Local Weekly Release

```bash
# Set environment variables
export ANTHROPIC_API_KEY=sk-...
export GITHUB_TOKEN=ghp_...

# Run with default 7-day window
npx tsx lib/effect-ci/release-plan.ts run

# Output:
# - release_notes.md
# - release_notes.json
# - GitHub Release: weekly-2025-10-17
```

### Custom Date Range

```bash
npx tsx lib/effect-ci/release-plan.ts run \
  --since 2025-10-01T00:00:00Z \
  --until 2025-10-17T00:00:00Z
```

### Dry Run (Preview)

```bash
npx tsx lib/effect-ci/release-plan.ts run --dry-run

# Output:
# === DRY RUN ===
# Markdown preview (first 800 chars):
# # Weekly Release Notes
# ...
# JSON keys: window, highlights, customer_impact, features, ...
```

### GitHub Actions Integration

```bash
# Generate workflow YAML
npx tsx lib/effect-ci/release-plan.ts emit-workflow > .github/workflows/weekly.yml

# Commit and push
git add .github/workflows/weekly.yml
git commit -m "Add weekly release automation"
git push
```

The generated workflow runs every Friday at 10 AM PT and creates a GitHub Release with both Markdown notes and a JSON asset for downstream systems (BI, support, etc.).

### DAG Workflow Definition

```typescript
// workflows/build-and-release.ts
import { parseDAGSync } from './lib/effect-ci/dag-config'
import { task, gate, fanout, fanin, edge } from './lib/effect-ci/dag-builder'
import YAML from 'yaml'
import fs from 'node:fs'

const dag = {
  name: "build_and_release",
  version: "1.0.0",
  triggers: [
    { _tag: "push" as const, branches: ["main"] }
  ],
  defaults: {
    retry: {
      maxAttempts: 3,
      backoff: {
        _tag: "exponential" as const,
        baseDelayMs: 500,
        factor: 2,
        maxDelayMs: 10_000
      }
    },
    env: { NODE_ENV: "production" }
  },
  nodes: [
    task("checkout", { uses: "actions/checkout@v4" }),
    gate("only_main", "github.ref == 'refs/heads/main'"),
    fanout("parallel_builds"),
    task("build_web", { run: "pnpm build --filter web" }),
    task("build_api", { run: "pnpm build --filter api" }),
    task("test_api", { run: "pnpm test:api", env: { CI: "true" } }),
    fanin("join_builds"),
    task("release", { run: "pnpm release", secrets: ["NPM_TOKEN"] }),
  ],
  edges: [
    edge("checkout", "only_main"),
    edge("only_main", "parallel_builds", "expr"),
    edge("parallel_builds", "build_web"),
    edge("parallel_builds", "build_api"),
    edge("build_api", "test_api"),
    edge("build_web", "join_builds"),
    edge("test_api", "join_builds"),
    edge("join_builds", "release"),
  ]
}

// Validate and export
const validated = parseDAGSync(dag)
fs.writeFileSync("dag-output.json", JSON.stringify(validated, null, 2))
fs.writeFileSync("dag-output.yaml", YAML.stringify(validated))

console.log("✓ DAG validated successfully")
```

```bash
# Validate DAG definition
npx tsx workflows/build-and-release.ts

# Output:
# ✓ DAG validated successfully
# - dag-output.json (validated JSON)
# - dag-output.yaml (validated YAML)
```

## Customization Patterns

### Custom Prompt Template

Edit [`transforms.ts:buildPrompt`](../../registry/effect-ci/transforms.ts#L50) to change the prompt:

```typescript
export const buildPrompt = (ctx) => `You are a release manager...

Custom instructions:
- Focus on customer-facing changes
- Include migration guides for breaking changes
- Highlight performance improvements

...rest of prompt...
`
```

### Custom LLM Provider

Replace `Claude.ask` in [`shell-runner.ts`](../../registry/effect-ci/shell-runner.ts#L90):

```typescript
export const OpenAI = {
  ask: (model: string, prompt: string) =>
    Effect.tryPromise({
      try: () => fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }]
        })
      }).then(r => r.json()).then(data => data.choices[0].message.content),
      catch: (e) => new Error(`OpenAI API failed: ${e}`)
    })
}
```

### Monorepo Bucketing

Add a transform in [`transforms.ts`](../../registry/effect-ci/transforms.ts):

```typescript
export const bucketByPath = (prs: ReadonlyArray<PR>) => {
  const apps = prs.filter(pr => pr.url.includes("/apps/"))
  const packages = prs.filter(pr => pr.url.includes("/packages/"))
  const infra = prs.filter(pr => pr.url.includes("/infra/"))
  return { apps, packages, infra }
}
```

Then update [`release-plan.ts`](../../registry/effect-ci/release-plan.ts#L50) to group sections.

## Testing Strategy

### Unit Tests (Transform Functions)

```typescript
import { describe, it, expect } from 'vitest'
import * as T from './transforms'

describe('transforms', () => {
  it('parses commits from TSV', () => {
    const tsv = "abc123|abc|2025-10-17T12:00:00Z|Ben|ben@example.com|Add feature"
    const commits = T.parseCommits(tsv)
    expect(commits).toHaveLength(1)
    expect(commits[0].subject).toBe("Add feature")
  })

  it('dedupes commits covered by PRs', () => {
    const commits = [{ fullSha: "abc123", ... }]
    const prs = [{ mergeCommit: { oid: "abc123" }, ... }]
    const deduped = T.dedupe(commits, prs)
    expect(deduped).toHaveLength(0)
  })
})
```

### Integration Tests (Shell Runners)

```typescript
import { describe, it, expect } from 'vitest'
import { Git, GH } from './shell-runner'
import { Effect } from 'effect'

describe('shell runners', () => {
  it('fetches default branch', () =>
    Effect.runPromise(
      Effect.gen(function*() {
        const branch = yield* GH.defaultBranch()
        expect(branch).toBe("main")
      })
    )
  )
})
```

### E2E Tests (Full Pipeline)

```typescript
import { describe, it, expect } from 'vitest'
import { runPlan } from './release-plan'
import { Effect } from 'effect'

describe('release plan', () => {
  it('generates release notes for last 7 days', () =>
    Effect.runPromise(
      Effect.gen(function*() {
        const result = yield* runPlan({
          ...weeklyPlan,
          output: { toJsonFile: "test-release.json" }
        }, true)  // dry run

        expect(result.json.highlights).toBeTruthy()
        expect(result.md).toContain("# Weekly Release Notes")
      })
    )
  )
})
```

## Performance Characteristics

- **Execution Time**: ~30-60s (git: 2s, gh: 5s, Claude: 15-30s, gh release: 5s)
- **API Costs**: ~$0.01-0.05 per run (Claude API via stdin CLI)
- **Rate Limits**: Respects GitHub API limits via `gh` CLI
- **Caching**: No built-in caching; runs are stateless

## Open Questions

1. **Caching**: Should we cache Claude responses for identical prompts?
2. **Retries**: Add Effect.retry for transient failures (API rate limits)?
3. **Notifications**: Built-in Slack/Teams output or separate component?
4. **Multi-Repo**: How to aggregate PRs from multiple repos in a monorepo org?
5. **Approval**: Should releases require manual approval before publishing?

## Related Documents

- [Effect CLI Docs](https://effect.website/docs/cli) - Official Effect CLI documentation
- [Effect Platform Command](https://effect.website/docs/platform/command) - Command execution docs
- [Effect Schema](https://effect.website/docs/schema) - Schema validation docs
- [Meta Effect Philosophy](../core/overview.md) - Vendorable component philosophy

## Contributing

This is a living document. As users customize `effect-ci`, we update this spec with:
- Common customization patterns
- Integration examples (Slack, DataDog, etc.)
- Performance optimizations
- Community feedback

See [registry README](../../registry/README.md) for vendoring instructions.
