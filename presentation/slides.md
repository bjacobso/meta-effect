---
theme: default
background: https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072
class: text-center
highlighter: shiki
lineNumbers: true
info: |
  ## Meta Effect
  Copy-Paste Architecture for Effect-TS

  A lightning talk about vendorable components
drawings:
  persist: false
transition: slide-left
title: Meta Effect
mdc: true
---

# META EFFECT

Not a framework. Not an npm package. A vibe.

<div class="pt-12">
  <span @click="$slidev.nav.next" class="px-2 py-1 rounded cursor-pointer" hover="bg-white bg-opacity-10">
    Press Space for next page <carbon:arrow-right class="inline"/>
  </span>
</div>

---
layout: center
class: text-center
---

# What if integrating Effect felt like copying a component from shadcn/ui?

<v-click>

<div class="pt-8 text-2xl">

Every framework tells you what to do.

</div>

</v-click>

<v-click>

<div class="pt-4 text-2xl">

Every npm package traps you in version purgatory.

</div>

</v-click>

<v-click>

<div class="pt-4 text-2xl">

You don't *own* your tools anymore.

</div>

</v-click>

---
layout: center
class: text-center
---

# Meta Effect flips that.

<v-click>

<div class="pt-8 text-3xl font-bold">

It's *copy–paste architecture*.

</div>

</v-click>

<v-click>

<div class="pt-12">

Every component is ~50 lines of pure Effect.

You vendor it, tweak it, own it.

**No updates. No lock-in. No drama.**

</div>

</v-click>

---

# Not a framework — a library of living blueprints.

<v-click>

Each component = one well-lit example of Effect at work:

</v-click>

<v-clicks>

* `effect-vite` → bootstrapping Vite as an Effect service
* `effect-remix` → turning Remix actions into typed Effects
* `effect-ci` → DAG runner for GitHub workflows
* `effect-livestore` → local-first reactive storage

</v-clicks>

<v-click>

<div class="pt-8 text-xl italic">

They all *fit in your head.*

Each file is a poem about dependency injection.

</div>

</v-click>

---

# Show, Don't Tell: DAG Workflow DSL

```typescript {all|1-8|10-14|16-23}{maxHeight:'400px'}
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

<v-click>

**That's 24 lines. Type-safe. Compiles to GitHub Actions, AWS Step Functions, or runs locally.**

</v-click>

---

# Expression Evaluation: CEL Integration

```typescript {all|3-5|7-10|12-14}{maxHeight:'400px'}
const evaluator = createCELEvaluator()

// Boolean conditions for workflow gates
const isCritical = yield* evaluator.evalBoolean(
  "severity == 'SEV-1' && customerImpact == true",
  { severity: "SEV-1", customerImpact: true })

// Collection operations
const hasRole = yield* evaluator.evalBoolean(
  "has(user.roles) && 'admin' in user.roles",
  { user: { roles: ['admin', 'user'] } })

// Feature flags with complex logic
const canAccessBeta = yield* evaluator.evalBoolean(
  "user.plan == 'enterprise' && has(user.betaOptIn) && user.betaOptIn",
  { user: { plan: "enterprise", betaOptIn: true } })
```

<v-click>

**Sandboxed, production-safe expression evaluation. Copy the 60-line CEL wrapper.**

</v-click>

---

# Schema-Driven Multi-Target Compilation

```typescript {all|1-12|14-19|21-24}{maxHeight:'400px'}
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

<v-click>

**Write once, run anywhere. ~80 lines per compiler.**

</v-click>

---

# Effect Service Pattern: Dependency Injection

```typescript {all|1-8|10-16|18-21}{maxHeight:'400px'}
// Define service interface
const evaluator = createCELEvaluator()

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

<v-click>

**Testable, composable, swappable. No DI framework required.**

</v-click>

---

# Branded Types & Schema Validation

```typescript {all|2-6|9-14|17-21}{maxHeight:'400px'}
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

<v-click>

**Compile-time + runtime safety. Zero-cost abstractions.**

</v-click>

---
layout: center
class: text-center
---

<div class="text-4xl font-bold">

Copy → Customize → Compose

</div>

<v-click>

<div class="pt-12 text-2xl">

That's the loop.

</div>

</v-click>

---
layout: two-cols
---

# npm packages say:

<div class="pt-8 text-3xl italic">

"trust us."

</div>

::right::

<v-click>

# Meta Effect says:

<div class="pt-8 text-3xl italic">

"own this."

</div>

</v-click>

---

# Real Domain: Release Orchestration

```typescript {all|1-3|5-7|9-11|13-15}{maxHeight:'380px'}
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

<v-click>

**Compiles to .github/workflows/release.yml. Or runs locally with mocked tasks.**

</v-click>

---

# The Philosophy

<v-clicks>

* No versioning.
* No abstraction hiding.
* No secret runtime.
* Every operation is an Effect.
* Every abstraction is transparent.
* Every component teaches you something.

</v-clicks>

<v-click>

<div class="pt-12 text-2xl italic text-center">

*"If it's over 100 lines, it's not a component — it's a framework."*

</div>

</v-click>

---
layout: center
class: text-center
---

# This isn't just code.

<v-click>

<div class="pt-8 text-3xl font-bold">

It's a **living design lab**.

</div>

</v-click>

---
layout: two-cols
---

# Art Project

<v-click>

Specs are design manifestos.

*"What could an Effect-first world look like?"*

</v-click>

::right::

<v-click>

# Science Experiment

None of these components *work perfectly yet.*

That's intentional.

**The repo is a garden, not a museum.**

</v-click>

---
layout: center
class: text-center
---

<div class="text-3xl italic">

"The bugs are the research questions."

</div>

---

# Specs as the New Source Code

Specs live in `docs/specs/`.

They describe what *should* exist — API surface, DSL, examples.

The implementation comes later.

<v-click>

<div class="pt-8">

Specs are executable philosophy:

* `status: "planned"` = aspirational
* `status: "implemented"` = iteration one
* `status: "deprecated"` = evolution complete

</div>

</v-click>

---

# Built for AI-Assisted Collaboration

<v-clicks>

Specs are small enough to fit in a context window.

Vendored code is small enough to rewrite.

That's how agents will help us maintain code at scale.

</v-clicks>

---

# The Invitation

<div class="grid grid-cols-2 gap-12 pt-8">

<div>

<v-click>

## Path 1

**Implement the spec.**

Submit a 50-line component.

</v-click>

</div>

<div>

<v-click>

## Path 2

**Challenge the spec.**

Rewrite the design. Prove it better.

</v-click>

</div>

</div>

<v-click>

<div class="pt-12 text-2xl text-center">

No gatekeepers.

Just consensus through code.

</div>

</v-click>

---
layout: center
class: text-center
---

<div class="text-4xl italic">

"The future of code isn't frameworks.

It's living specifications."

</div>

---
layout: end
class: text-center
---

# Copy. Paste. Own.

<div class="pt-8 text-3xl">

That's the Meta Effect.

</div>

<div class="pt-12 text-xl opacity-75">
  github.com/effect-meta/meta-effect
</div>
