# Meta Effect Presentation Prompt

When generating slides for Meta Effect presentations, create a lightning talk that feels alive, irreverent, meta-aware, and visionary. The presentation should sound like a hacker manifesto meets a New Yorker cartoon meets a Vite demo - tuned for short, high-impact meetup slots.

Make sure the presentation conveys concrete, specific language, avoids abstract nouns, and maintains the philosophy that "Meta Effect is not a framework, not an npm package - it's a vibe."

**Any specific instructions about presentation content or structure should supersede these defaults.**

---

## Act 1 — The Hook

> *"What if integrating Effect felt like copying a component from shadcn/ui?"*

Every framework tells you what to do.
Every npm package traps you in version purgatory.
You don't *own* your tools anymore.

**Meta Effect flips that.**
It's *copy–paste architecture*.
Every component is ~50 lines of pure Effect.
You vendor it, tweak it, own it.
No updates. No lock-in. No drama.

---

## Act 2 — The Pattern

> *"Not a framework — a library of living blueprints."*

Each component = one well-lit example of Effect at work:

* `effect-vite` → bootstrapping Vite as an Effect service
* `effect-remix` → turning Remix actions into typed Effects
* `effect-ci` → DAG runner for GitHub workflows
* `effect-livestore` → local-first reactive storage

They all *fit in your head.*
Each file is a poem about dependency injection.

---

## Act 3 — The Demo (Show, Don't Tell)

### DAG Workflow DSL

Show a complete, working example from the registry:

```typescript
class ETLPipeline extends Workflow.make(
  "etl_pipeline",
  "1.0.0",
  { triggers: [ScheduleTrigger.make({ cron: "0 2 * * *" })] },

  // Define nodes
  Task.make("extract", { run: "python extract.py" }),
  Gate.make("quality_check", { condition: "row_count > 1000" }),

  Fanout.make("parallel_transform"),
  Task.make("transform_a", { run: "python transform_a.py" }),
  Task.make("transform_b", { run: "python transform_b.py" }),
  Fanin.make("join_results"),
  Task.make("load", { run: "python load.py" }),

  // Define edges (execution flow)
  Edge.make("extract", "quality_check"),
  Edge.make("quality_check", "parallel_transform", { condition: "expr" }),
  Edge.make("parallel_transform", "transform_a"),
  Edge.make("parallel_transform", "transform_b"),
  Edge.make("transform_a", "join_results"),
  Edge.make("transform_b", "join_results"),
  Edge.make("join_results", "load")
) {}
```

**That's 24 lines. Type-safe. Compiles to GitHub Actions, AWS Step Functions, or runs locally.**

### Expression Evaluation

Show CEL integration for production-safe expression evaluation:

```typescript
const evaluator = createCELEvaluator()

// Boolean conditions for workflow gates
const isCritical = yield* evaluator.evalBoolean(
  "severity == 'SEV-1' && customerImpact == true",
  { severity: "SEV-1", customerImpact: true })

// Collection operations
const hasRole = yield* evaluator.evalBoolean(
  "has(user.roles) && 'admin' in user.roles",
  { user: { roles: ['admin', 'user'] } })
```

**Sandboxed, production-safe expression evaluation. Copy the 60-line CEL wrapper.**

### Schema-Driven Multi-Target Compilation

Show how one DAG compiles to multiple platforms:

```typescript
// Single DAG definition
const workflow: DagConfig = {
  name: "build_and_release",
  nodes: [
    { _tag: "task", id: "build", run: "pnpm build" },
    { _tag: "gate", id: "only_main",
      condition: "github.ref == 'refs/heads/main'" },
    { _tag: "task", id: "deploy", run: "pnpm deploy" }
  ],
  edges: [
    { from: "build", to: "only_main" },
    { from: "only_main", to: "deploy" }
  ]
}

// Compile to multiple targets in parallel
const [gha, stepFn, mermaid] = yield* Effect.all([
  compileDagToGitHubActions(workflow),
  compileDagToStepFunctions(workflow),
  dagToMermaid(workflow)
])

// One source → GitHub Actions YAML, AWS Step Functions ASL, docs
yield* writeFile(".github/workflows/release.yml", YAML.stringify(gha))
yield* writeFile("infra/state-machine.json", JSON.stringify(stepFn, null, 2))
```

**Write once, run anywhere. ~80 lines per compiler.**

### Effect Service Pattern

Show dependency injection without a framework:

```typescript
const workflow = Effect.gen(function*() {
  // Services are injected via Effect's context
  const eval = yield* ExpressionEvaluator

  const isCritical = yield* eval.evalBoolean(
    "severity == 'SEV-1'",
    { severity: "SEV-1" })

  if (isCritical) {
    yield* pageExecutives()
  }
})

// Swap implementations at runtime
Effect.runPromise(workflow.pipe(
  Effect.provideService(ExpressionEvaluator, evaluator)
))

// Or use mock in tests
Effect.runPromise(workflow.pipe(
  Effect.provideService(ExpressionEvaluator, mockEvaluator)
))
```

**Testable, composable, swappable. No DI framework required.**

### Branded Types & Schema Validation

Show compile-time and runtime safety:

```typescript
// Branded types for compile-time safety
export type NodeId = string & Brand.Brand<"NodeId">
export const NodeId = Schema.String.pipe(
  Schema.pattern(/^[a-z][a-z0-9_]*$/i),
  Schema.brand("NodeId")
)

// Effect Schema classes with runtime validation
export class TaskNode extends Schema.TaggedStruct("task", {
  id: NodeId,
  uses: Schema.optional(Schema.String),
  run: Schema.optional(Schema.String),
  env: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String }))
}) {}

// Automatic validation on construction
const node = TaskNode.make({
  _tag: "task",
  id: "build" as NodeId,  // Branded at compile time
  run: "pnpm build"
})  // Throws ParseError if invalid at runtime
```

**Compile-time + runtime safety. Zero-cost abstractions.**

Copy → Customize → Compose.
That's the loop.

---

## Act 4 — The Philosophy

npm packages say: "trust us."
Meta Effect says: "own this."

* No versioning.
* No abstraction hiding.
* No secret runtime.
* Every operation is an Effect.
* Every abstraction is transparent.
* Every component teaches you something.

> *"If it's over 100 lines, it's not a component — it's a framework."*

---

## Act 5 — The Art + Science Bit

This isn't just code.
It's a **living design lab**.

* **Art Project:** Specs are design manifestos.
  "What *could* an Effect-first world look like?"
* **Science Experiment:** None of these components *work perfectly yet.*
  That's intentional.
  The repo is a garden, not a museum.

> "The bugs are the research questions."

---

## Act 6 — Specs as the New Source Code

Specs live in `docs/specs/`.
They describe what *should* exist — API surface, DSL, examples.
The implementation comes later.

Specs are executable philosophy:

* `status: "planned"` = aspirational
* `status: "implemented"` = iteration one
* `status: "deprecated"` = evolution complete

This model is built for AI-assisted collaboration.
Specs are small enough to fit in a context window.
Vendored code is small enough to rewrite.
That's how agents will help us maintain code at scale.

---

## Act 7 — The Invitation

Two paths:

1. **Implement the spec.**
   Submit a 50-line component.
2. **Challenge the spec.**
   Rewrite the design. Prove it better.

No gatekeepers.
Just consensus through code.

---

## Act 8 — Closing

> "The future of code isn't frameworks.
> It's living specifications."

Copy. Paste. Own.
That's the Meta Effect.

---

## Slide Design Principles

- Use v-click for progressive disclosure
- Keep code examples focused and readable
- Use two-cols layout for comparisons
- Center text for dramatic moments
- Tight, lightning-talk rhythm (15-18 slides, 5 minutes)
- No emoji unless explicitly requested
- Monospace-friendly formatting
- Dramatic effect through spacing and pauses

## Target Audience

**Deeply technical developers** who want to see:
- Real, working code from the registry (not pseudo-code)
- Complete DSL examples with domain context
- Effect patterns: Service, Schema, Brand, Layer
- Schema-driven compilation (one source → many targets)
- Performance characteristics and algorithms (O(V+E) validation, topological execution)
- Production trade-offs (CEL vs simple evaluator, local vs remote execution)
- Type safety at compile-time AND runtime

The audience cares about:
- Actual implementation details (~50-100 line components)
- How Effect patterns compose (Service + Schema + Layer)
- Multi-target compilation (DAG → GitHub Actions, AWS Step Functions)
- Vendorable architecture (copy-paste, no npm lock-in)
- Algorithms used (topological sort, cycle detection, DFS)

## Deep Domain Examples

Include real-world use cases with complete code:

### Release Orchestration
```typescript
class ReleaseWorkflow extends Workflow.make(
  "release",
  "1.0.0",
  { triggers: [PushTrigger.make({ branches: ["main"] })] },

  Task.make("validate_version", { run: "pnpm tsx scripts/validate-version.ts" }),
  Task.make("run_tests", { run: "pnpm test" }),
  Fanout.make("parallel_builds"),
  Task.make("build_packages", { run: "pnpm build" }),
  Task.make("generate_changelog", { run: "pnpm changeset version" }),
  Fanin.make("builds_complete"),
  Gate.make("tests_passed", { condition: "success() && github.ref == 'refs/heads/main'" }),
  Task.make("publish", { run: "pnpm changeset publish", secrets: ["NPM_TOKEN"] }),

  Edge.make("validate_version", "run_tests"),
  Edge.make("run_tests", "parallel_builds"),
  Edge.make("parallel_builds", "build_packages"),
  Edge.make("parallel_builds", "generate_changelog"),
  Edge.make("build_packages", "builds_complete"),
  Edge.make("generate_changelog", "builds_complete"),
  Edge.make("builds_complete", "tests_passed"),
  Edge.make("tests_passed", "publish", { condition: "expr" })
) {}
```

**This compiles to .github/workflows/release.yml OR runs locally with mocked tasks.**

### ETL Data Pipeline
Show parallel transformation with quality gates, demonstrating fanout/fanin patterns.

### Incident Response Workflow
Show conditional gates with CEL expressions for severity checks, demonstrating human-in-the-loop patterns.

## Technical Architecture Insights

When presenting, emphasize:

**Algorithms**:
- DAG validation: O(V + E) via DFS cycle detection
- Execution: Topological sort with parallel batching
- Compilation: Pure transformation (Schema → Target)

**Effect Patterns**:
- Service pattern for dependency injection (no framework needed)
- Schema pattern for runtime + compile-time validation
- Brand pattern for nominal typing (NodeId can't be confused with string)
- Layer pattern for composing dependencies

**Multi-Target Compilation**:
- One DAG definition → GitHub Actions YAML (~80 lines compiler)
- Same DAG → AWS Step Functions ASL (~80 lines compiler)
- Same DAG → Mermaid diagram (~50 lines compiler)
- Same DAG → Local execution (~100 lines interpreter)

**Production Trade-offs**:
- Simple evaluator: Fast, zero deps, UNSAFE (use in dev only)
- CEL evaluator: Sandboxed, industry standard, safe for prod
- Local execution: Fast iteration, debugging
- Remote execution: GitHub Actions, AWS, production

## Compilation Notes

- Compile into Slidev-ready format with centered text
- Use Acts 1-8 structure for organization
- Include `v-click` transitions for dramatic reveals
- Code samples should be REAL CODE from the registry (not pseudo-code)
- Show line counts to emphasize minimalism (~50-100 lines per component)
- Progressive disclosure: Show code structure first, then details, then implications
- Maintain conversational, irreverent tone throughout
- Each slide should feel punchy and quotable
- Use syntax highlighting with line annotations: `{all|1-5|7-10}` to walk through code
