# Effect Workflow DSL - Implementation Plan

> **Note**: This plan has been formalized as [RFC: effect-workflow](./docs/rfcs/effect-workflow-rfc.md). The RFC is the official proposal document for community review. This file serves as the working implementation plan.

## Vision

Transform the ChatGPT DAG/Forms/Entity DSL concept into **Meta Effect** vendorable components. Instead of a monolithic framework, we'll create ~10-15 minimal primitives (~50-100 lines each) that compose into powerful workflow automation.

**Core Insight**: The ChatGPT proposal is brilliant but framework-shaped. We'll distill it into copy-pasteable primitives that users own and customize.

## Philosophy Alignment

### ✅ What Fits Meta Effect
- **Data-first schemas** (Dag, FormIR, EntityIR) - Pure Effect Schema definitions
- **Pure transformations** (buildPrompt, toDagYaml, toGithubActions) - Stateless functions
- **Minimal interpreters** (runDag, evaluateGate) - Effect.gen programs
- **Composable builders** (task(), gate(), edge()) - Ergonomic constructors

### ❌ What Doesn't (Yet)
- **Full policy engines** - Too complex for v1; defer to OPA/Cedar integration
- **Assignment resolver with SLA tracking** - Needs durable state; future component
- **Multi-target form renderers** - React/Shadcn compiler could be separate component

### 🎯 Our Approach
Build **effect-workflow** (not effect-dag, not effect-ci-extended) with three component families:

1. **Workflow Core** - DAG schema, interpreter, builders (~250 lines, 4 components)
2. **Form DSL** - Schema, parser, compilers (~220 lines, 3 components)
3. **Compilers** - To GitHub Actions, local execution (~180 lines, 2-3 components)

Total: **~650 lines across 9-10 components** vs. ChatGPT's ~1500 line monolith.

---

## Component Architecture

### Family 1: Workflow Core (`effect-workflow/dag-*`)

#### 1. `dag-schema.ts` (~80 lines)
**Purpose**: Effect Schema definitions for workflow primitives.

**What it provides**:
- Core types: `Task`, `Gate`, `Collect`, `FanOut`, `FanIn`, `Edge`, `Dag`
- Branded `Id` type for type-safe node references
- `Retry` configuration with fixed/exponential backoff
- Ergonomic builders: `task()`, `gate()`, `fanout()`, `fanin()`, `collect()`, `edge()`

**Example**:
```typescript
import { Dag, task, gate, edge } from './lib/effect-workflow/dag-schema'

const workflow: Dag = {
  name: "release",
  nodes: [
    task("build", { run: "pnpm build" }),
    gate("tests_pass", "ctx.tests.passed == true"),
    task("deploy", { run: "pnpm deploy" })
  ],
  edges: [
    edge("build", "tests_pass"),
    edge("tests_pass", "deploy")
  ]
}
```

**Key Design Decisions**:
- Branded `Id` type prevents accidental string errors
- Union type for `NodeCore` allows exhaustive pattern matching
- Builders return plain data (no classes at construction time)
- Serializes cleanly to JSON/YAML

---

#### 2. `dag-interpreter.ts` (~100 lines)
**Purpose**: Execute DAGs as Effect programs with topological scheduling.

**What it provides**:
- `runDag(dag: Dag)` - Main execution function
- `TaskRunner` service interface for dependency injection
- Topological sort algorithm for correct execution order
- Parallel execution for independent nodes
- Retry logic with exponential backoff
- Timeout support per node
- Context propagation (form inputs, runtime data)

**Example**:
```typescript
import { runDag } from './lib/effect-workflow/dag-interpreter'
import { Effect, Command } from 'effect'

const runner = {
  runTask: (task: Task) => Command.make("sh", "-c", task.run ?? "true"),
  evaluateExpr: (expr: string, ctx: Record<string, unknown>) =>
    Effect.succeed(true), // Simple stub; users provide real CEL evaluator
  onCollect: (formId: string) =>
    Effect.succeed({ version: "v1.0.0" }) // User input collection
}

Effect.runPromise(runDag(workflow).pipe(
  Effect.provideService(TaskRunner, runner)
))
```

**Key Design Decisions**:
- Dependency injection via `TaskRunner` service
- Users customize task execution, expression evaluation, form collection
- Topological sort ensures correct order
- Parallel execution for independent tasks using `Effect.forEach` with concurrency
- Gates block propagation when expression evaluates to false

---

#### 3. `dag-transforms.ts` (~70 lines)
**Purpose**: Pure transformation utilities for DAG manipulation.

**What it provides**:
- `toDagYaml(dag)` - Serialize to YAML
- `fromDagYaml(yaml)` - Parse from YAML
- `validateDag(dag)` - Schema validation + cycle detection
- `simplifyDag(dag)` - Remove redundant fanout/fanin nodes
- `dagToMermaid(dag)` - Generate Mermaid diagram

**Example**:
```typescript
import { validateDag, dagToMermaid } from './lib/effect-workflow/dag-transforms'

const errors = validateDag(workflow)
if (errors.length > 0) {
  console.error("DAG validation failed:", errors)
}

const diagram = dagToMermaid(workflow)
console.log(diagram)
// graph TD
//   build --> tests_pass
//   tests_pass --> deploy
```

---

### Family 2: Form DSL (`effect-workflow/form-*`)

#### 4. `form-schema.ts` (~70 lines)
**Purpose**: Effect Schema for inline form definitions with AI-friendly metadata.

**What it provides**:
- Core types: `FieldText`, `FieldSelect`, `FieldCheckbox`, `FieldDate`, `FormIR`
- `AIHints` for MCP-friendly metadata (intent, synonyms, examples, PII classification)
- Conditional field visibility with `when` expressions
- Validation rules (pattern, minLength, maxLength, required)

**Example**:
```typescript
import { FormIR } from './lib/effect-workflow/form-schema'

const releaseForm: FormIR = {
  id: "release_form",
  title: "Release Configuration",
  fields: [
    {
      kind: "text",
      id: "version",
      label: "Version Tag",
      required: true,
      pattern: "^v\\d+\\.\\d+\\.\\d+$",
      ai: { intent: "semver", examples: { version: "v1.2.3" } }
    },
    {
      kind: "select",
      id: "env",
      label: "Environment",
      options: [
        { value: "prod", label: "Production" },
        { value: "staging", label: "Staging" }
      ],
      required: true
    }
  ]
}
```

**Key Design Decisions**:
- AI hints make forms self-describing for MCP tools
- `when` enables conditional field visibility (e.g., show "customerId" when customerImpact=true)
- Unions allow exhaustive pattern matching
- No runtime rendering - just schema definitions

---

#### 5. `form-to-json-schema.ts` (~60 lines)
**Purpose**: Compile FormIR to JSON Schema for validation.

**What it provides**:
- `toJsonSchema(form)` - Convert FormIR to JSON Schema Draft 7
- Support for all field types with appropriate constraints
- Required fields handling
- Default values

**Example**:
```typescript
import { toJsonSchema } from './lib/effect-workflow/form-to-json-schema'
import Ajv from 'ajv'

const jsonSchema = toJsonSchema(releaseForm)
const ajv = new Ajv()
const validate = ajv.compile(jsonSchema)

const data = { version: "v1.2.3", env: "prod" }
const valid = validate(data)
```

---

#### 6. `form-parser.ts` (~90 lines) [OPTIONAL - PHASE 2+]
**Purpose**: Parse concise line-based DSL into FormIR.

**Status**: Nice-to-have; defer to v2 if time-constrained. Users can build FormIR directly in TypeScript.

**Example DSL**:
```
section "Release"
  text version "Version tag" pattern=^v\\d+\\.\\d+\\.\\d+$ required
  select env  "Environment" options=prod|staging default=prod required
  checkbox confirm "I understand this publishes to customers" required
```

---

### Family 3: Compilers (`effect-workflow/compile-*`)

#### 7. `compile-to-github-actions.ts` (~100 lines)
**Purpose**: Convert Dag to GitHub Actions YAML.

**What it provides**:
- `toGitHubActions(dag)` - Generate workflow YAML
- Maps nodes → jobs, edges → needs, gates → if conditions
- Handles secrets, environment variables, retries
- Compiles `collect` nodes to workflow_dispatch inputs

**Example**:
```typescript
import { toGitHubActions } from './lib/effect-workflow/compile-to-github-actions'
import YAML from 'yaml'

const workflow = toGitHubActions(dag)
const yaml = YAML.stringify(workflow)

// Output:
// name: release
// on: [push]
// jobs:
//   build:
//     runs-on: ubuntu-latest
//     steps:
//       - name: build
//         run: pnpm build
//   deploy:
//     runs-on: ubuntu-latest
//     needs: [build]
//     if: ctx.tests.passed == true
//     steps:
//       - name: deploy
//         run: pnpm deploy
```

**Key Design Decisions**:
- Structural nodes (gates/fanin/fanout) compile to conditions, not jobs
- Gate expressions become `if:` conditions on downstream jobs
- Secrets mapped to `${{ secrets.NAME }}` syntax
- Collect nodes become workflow_dispatch inputs

---

#### 8. `compile-to-step-functions.ts` (~120 lines) [OPTIONAL - PHASE 3+]
**Purpose**: Convert Dag to AWS Step Functions ASL (Amazon States Language).

**Status**: Future enhancement. Demonstrates multi-target compilation.

---

## Component Summary Table

| Component | Family | Lines | Purpose | Status |
|-----------|--------|-------|---------|--------|
| `dag-schema.ts` | Workflow Core | ~80 | Effect Schema for DAG + builders | Phase 1 |
| `dag-interpreter.ts` | Workflow Core | ~100 | Topological executor with retry/timeout | Phase 1 |
| `dag-transforms.ts` | Workflow Core | ~70 | Validation, YAML, Mermaid | Phase 1 |
| `form-schema.ts` | Form DSL | ~70 | Effect Schema for forms with AI hints | Phase 2 |
| `form-to-json-schema.ts` | Form DSL | ~60 | JSON Schema compiler | Phase 2 |
| `form-parser.ts` | Form DSL | ~90 | Concise DSL parser | Optional |
| `compile-to-github-actions.ts` | Compilers | ~100 | GHA YAML generator | Phase 1 |
| `compile-to-step-functions.ts` | Compilers | ~120 | AWS Step Functions ASL | Optional |
| **TOTAL (Core)** | | **~480** | **6 essential components** | |
| **TOTAL (Full)** | | **~690** | **8 components with optional** | |

---

## Implementation Phases

### Phase 1: Core Workflow (Week 1)
**Goal**: Minimal viable workflow system with local execution and GHA compilation.

**Deliverables**: 3 components, 1 example

1. `dag-schema.ts` - Core types and builders (~80 lines)
2. `dag-interpreter.ts` - Local execution engine (~100 lines)
3. `compile-to-github-actions.ts` - GHA compiler (~100 lines)
4. **Example**: `examples/release-basic.ts` - Simple build → test → deploy workflow

**Success Criteria**:
- [ ] Example runs locally with mock task runner
- [ ] Generates valid `.github/workflows/release.yml`
- [ ] All components ≤ 100 lines each
- [ ] Zero external dependencies beyond `effect`, `@effect/platform`

**Testing Strategy**:
```bash
# Run example locally
pnpm tsx examples/release-basic.ts

# Generate GHA YAML
pnpm tsx examples/release-basic.ts --emit-yaml > .github/workflows/release.yml

# Validate YAML
actionlint .github/workflows/release.yml
```

---

### Phase 2: Form Integration (Week 2)
**Goal**: Add form capabilities for human-in-the-loop workflows.

**Deliverables**: 2 components, 1 example

5. `form-schema.ts` - Form IR types (~70 lines)
6. `form-to-json-schema.ts` - JSON Schema compiler (~60 lines)
7. **Example**: `examples/release-with-approval.ts` - Release workflow with approval form (collect node)

**Success Criteria**:
- [ ] Form schema validates with Effect Schema
- [ ] JSON Schema compiler works for all field types
- [ ] Example shows `collect` node integration with DAG
- [ ] Form answers flow into task context

**Testing Strategy**:
```bash
# Generate JSON Schema for form
pnpm tsx examples/release-with-approval.ts --emit-form-schema > form.schema.json

# Validate sample data against schema
ajv validate -s form.schema.json -d sample-answers.json
```

---

### Phase 3: Transforms & Polish (Week 3)
**Goal**: Add validation, visualization, and comprehensive documentation.

**Deliverables**: 1 component, spec, examples, registry updates

8. `dag-transforms.ts` - Validation, YAML, Mermaid (~70 lines)
9. `docs/specs/effect-workflow.md` - Complete specification (following `effect-ci.md` pattern)
10. Update `registry/registry.json` with new components
11. Add 3-4 detailed examples (release, incident response, onboarding)
12. Update root `README.md` with effect-workflow section

**Success Criteria**:
- [ ] Cycle detection catches invalid DAGs
- [ ] Mermaid diagrams render correctly in GitHub
- [ ] Spec document complete with examples, architecture, customization patterns
- [ ] All components registered in `registry.json`

---

## Detailed Examples

### Example 1: Release with Canary + Approval

```typescript
import { Dag, task, gate, fanout, fanin, collect, edge } from './lib/effect-workflow/dag-schema'
import { FormIR } from './lib/effect-workflow/form-schema'

const approvalForm: FormIR = {
  id: "release_approval",
  title: "Release Approval",
  fields: [
    {
      kind: "text",
      id: "version",
      label: "Version Tag",
      required: true,
      pattern: "^v\\d+\\.\\d+\\.\\d+$",
      ai: { intent: "semver", examples: { version: "v1.2.3" } }
    },
    {
      kind: "checkbox",
      id: "testsPass",
      label: "All tests passing?",
      required: true
    },
    {
      kind: "checkbox",
      id: "docsUpdated",
      label: "Docs updated?",
      required: true
    }
  ]
}

const releaseWorkflow: Dag = {
  name: "release-with-approval",
  version: "1.0.0",
  defaults: {
    retry: {
      maxAttempts: 3,
      backoff: { type: "exponential", baseMs: 500, factor: 2, maxMs: 10000 }
    }
  },
  nodes: [
    task("checkout", { uses: "actions/checkout@v4" }),

    collect("approval", "release_approval"),

    fanout("build_parallel"),
    task("build_web", { run: "pnpm build --filter web" }),
    task("build_api", { run: "pnpm build --filter api" }),
    fanin("build_done"),

    task("canary", { run: "pnpm deploy:canary", secrets: ["DEPLOY_TOKEN"] }),
    gate("canary_healthy", "ctx.metrics.errorRate < 0.5"),

    task("deploy_prod", { run: "pnpm deploy:prod", secrets: ["DEPLOY_TOKEN"] })
  ],
  edges: [
    edge("checkout", "approval"),
    edge("approval", "build_parallel"),
    edge("build_parallel", "build_web"),
    edge("build_parallel", "build_api"),
    edge("build_web", "build_done"),
    edge("build_api", "build_done"),
    edge("build_done", "canary"),
    edge("canary", "canary_healthy"),
    edge("canary_healthy", "deploy_prod")
  ]
}
```

**Execution Flow**:
1. Checkout code
2. **Pause for human approval** (collect node)
3. Build web and API in parallel (fanout)
4. Wait for both builds to complete (fanin)
5. Deploy to canary environment
6. Check canary health metrics (gate)
7. Deploy to production if healthy

**Output**: GitHub Actions YAML with `workflow_dispatch` inputs for the approval form.

---

### Example 2: Incident Response with Severity Branching

```typescript
const triageForm: FormIR = {
  id: "incident_triage",
  title: "Incident Triage",
  fields: [
    {
      kind: "text",
      id: "title",
      label: "Incident Title",
      required: true
    },
    {
      kind: "select",
      id: "severity",
      label: "Severity",
      options: [
        { value: "SEV-1", label: "SEV-1 (Critical)" },
        { value: "SEV-2", label: "SEV-2 (High)" },
        { value: "SEV-3", label: "SEV-3 (Medium)" }
      ],
      required: true
    },
    {
      kind: "checkbox",
      id: "customerImpact",
      label: "Customer impact observed?"
    }
  ]
}

const incidentWorkflow: Dag = {
  name: "incident-response",
  nodes: [
    collect("triage", "incident_triage"),

    gate("is_sev1", "inputs.incident_triage.severity == 'SEV-1'"),
    gate("is_sev2", "inputs.incident_triage.severity == 'SEV-2'"),

    // SEV-1 path
    task("page_execs", { run: "ops notify execs" }),
    task("legal_sync", { run: "ops legal --brief" }),

    // All severities
    task("page_oncall", { run: "ops page --user oncall" }),
    task("create_room", { run: "ops room create" }),

    task("postmortem", { run: "ops postmortem init" })
  ],
  edges: [
    edge("triage", "is_sev1"),
    edge("triage", "is_sev2"),
    edge("is_sev1", "page_execs"),
    edge("is_sev1", "legal_sync"),
    edge("triage", "page_oncall"),
    edge("triage", "create_room"),
    edge("page_oncall", "postmortem"),
    edge("create_room", "postmortem"),
    edge("page_execs", "postmortem"),
    edge("legal_sync", "postmortem")
  ]
}
```

**Execution Flow**:
1. Collect triage information via form
2. Evaluate severity gates
3. **If SEV-1**: Page executives + sync with legal (in parallel)
4. **Always**: Page oncall + create war room (in parallel)
5. Wait for all actions to complete
6. Initialize postmortem

---

### Example 3: Onboarding with Parallel Provisioning

```typescript
const onboardForm: FormIR = {
  id: "employee_onboard",
  title: "New Employee Onboarding",
  fields: [
    {
      kind: "text",
      id: "fullName",
      label: "Full Name",
      required: true,
      ai: { intent: "person_name", pii: true }
    },
    {
      kind: "email",
      id: "email",
      label: "Work Email",
      required: true,
      ai: { pii: true }
    },
    {
      kind: "select",
      id: "role",
      label: "Role",
      options: [
        { value: "engineer", label: "Engineer" },
        { value: "designer", label: "Designer" },
        { value: "pm", label: "Product Manager" }
      ],
      required: true
    },
    {
      kind: "date",
      id: "startDate",
      label: "Start Date",
      required: true
    }
  ]
}

const onboardingWorkflow: Dag = {
  name: "employee-onboarding",
  nodes: [
    collect("collect_employee", "employee_onboard"),

    fanout("provision_parallel"),
    task("acct_gsuite", { run: "it gsuite create '$FULLNAME' '$EMAIL'" }),
    task("acct_github", { run: "it github invite '$EMAIL' --team '$ROLE'" }),
    task("acct_slack", { run: "it slack invite '$EMAIL'" }),
    fanin("provision_done"),

    task("grant_access", { run: "it access grant --email '$EMAIL' --role '$ROLE'" }),
    task("notify_manager", { run: "notify manager 'New hire onboarded: $FULLNAME'" })
  ],
  edges: [
    edge("collect_employee", "provision_parallel"),
    edge("provision_parallel", "acct_gsuite"),
    edge("provision_parallel", "acct_github"),
    edge("provision_parallel", "acct_slack"),
    edge("acct_gsuite", "provision_done"),
    edge("acct_github", "provision_done"),
    edge("acct_slack", "provision_done"),
    edge("provision_done", "grant_access"),
    edge("grant_access", "notify_manager")
  ]
}
```

---

## Integration with Existing `effect-ci`

The new `effect-workflow` components **compose** with existing `effect-ci`:

```typescript
import { ReleasePlan, runPlan } from './lib/effect-ci/release-plan'
import { Dag, task, edge } from './lib/effect-workflow/dag-schema'
import { runDag } from './lib/effect-workflow/dag-interpreter'

// Wrap effect-ci release plan in a workflow node
const weeklyReleaseWorkflow: Dag = {
  name: "weekly-release-automation",
  nodes: [
    task("fetch_commits", { run: "git fetch origin main" }),
    task("generate_notes", { run: "npx tsx lib/effect-ci/release-plan.ts run" }),
    task("create_release", { run: "gh release create $(cat tag.txt) -F release_notes.md" })
  ],
  edges: [
    edge("fetch_commits", "generate_notes"),
    edge("generate_notes", "create_release")
  ]
}

// Or: embed release-plan as an Effect program inside a task runner
const runner = {
  runTask: (task: Task) => {
    if (task.id === "generate_notes") {
      return runPlan(weeklyPlan, false)
    }
    return Command.make("sh", "-c", task.run)
  },
  evaluateExpr: (expr, ctx) => Effect.succeed(true),
  onCollect: (formId) => Effect.succeed({})
}

Effect.runPromise(runDag(weeklyReleaseWorkflow).pipe(
  Effect.provideService(TaskRunner, runner)
))
```

**Synergy**:
- `effect-ci` provides the **what** (release notes content)
- `effect-workflow` provides the **how** (orchestration, approval gates, deployment steps)

---

## Open Design Questions

### 1. Entity DSL - Separate Component Family?
**Decision**: Defer to Phase 4. Not essential for workflows; users can define entities with plain Effect Schema.

**Rationale**: The ChatGPT proposal included entity definitions (Employee, Device, etc.) but these are better handled with existing Effect Schema patterns. We can add a dedicated `entity-schema.ts` component later if demand emerges.

---

### 2. Assignment/SLA Tracking - Durable State?
**Decision**: Out of scope for vendorable components. Users integrate with external systems (Linear, Jira, PagerDuty) via task runners.

**Rationale**: True SLA tracking requires durable state (databases, cron jobs, escalation logic). This conflicts with the "vendorable primitive" philosophy. Instead, users should:
- Store workflow state in their DB of choice
- Trigger workflows from external systems (GitHub webhooks, Linear triggers, etc.)
- Implement SLA checks as scheduled tasks that query state and trigger escalation workflows

---

### 3. Expression Evaluator - CEL/JEXL/Custom?
**Decision**: Start with stub (`() => Effect.succeed(true)`). Users provide real evaluator via service.

**Future Option**: Vendorable `cel-evaluator.ts` (~60 lines) using `@celsandbox/cel-js`.

**Example Stub**:
```typescript
const evaluator = {
  evaluateExpr: (expr: string, ctx: Record<string, unknown>) =>
    Effect.try(() => {
      // Simplistic evaluation for demo purposes
      // Production: use CEL, JEXL, or custom parser
      return eval(`(${expr})`) // UNSAFE - for demo only
    })
}
```

**Production CEL Integration** (future component):
```typescript
import { CEL } from '@celsandbox/cel-js'

export const createCELEvaluator = () => {
  const cel = new CEL()

  return {
    evaluateExpr: (expr: string, ctx: Record<string, unknown>) =>
      Effect.try(() => {
        const program = cel.compile(expr)
        return program.evaluate(ctx)
      })
  }
}
```

---

### 4. Form Renderer - React/Shadcn Component?
**Decision**: **Yes, but as separate optional component** `form-to-react-shadcn.ts` (~120 lines). Uses template generation; not runtime rendering.

**Approach**: Generate TypeScript/TSX source code from FormIR, not runtime rendering.

**Example**:
```typescript
import { toReactShadcn } from './lib/effect-workflow/form-to-react-shadcn'

const componentSource = toReactShadcn(releaseForm, {
  imports: {
    Input: "@/components/ui/input",
    Select: "@/components/ui/select",
    Button: "@/components/ui/button"
  }
})

// Writes TypeScript source file
fs.writeFileSync("ReleaseForm.tsx", componentSource)
```

**Generated Output**:
```tsx
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

export function ReleaseForm({ onSubmit }: Props) {
  const [values, setValues] = useState({})

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(values) }}>
      <Input
        id="version"
        label="Version Tag"
        required
        pattern="^v\\d+\\.\\d+\\.\\d+$"
        value={values.version}
        onChange={(e) => setValues({ ...values, version: e.target.value })}
      />
      <Select
        id="env"
        label="Environment"
        required
        options={[
          { value: "prod", label: "Production" },
          { value: "staging", label: "Staging" }
        ]}
        value={values.env}
        onChange={(v) => setValues({ ...values, env: v })}
      />
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

---

## Success Metrics

### ✅ Phase 1 Complete When:
- [ ] 3 core workflow components (schema, interpreter, compiler)
- [ ] Example `release-basic.ts` runs locally and generates valid GHA YAML
- [ ] All components ≤ 100 lines each
- [ ] Zero external dependencies beyond `effect`, `@effect/platform`
- [ ] Can execute simple build → test → deploy workflow locally
- [ ] Generated GitHub Actions YAML passes `actionlint` validation

### ✅ Phase 2 Complete When:
- [ ] Form schema + JSON Schema compiler working
- [ ] Example `release-with-approval.ts` shows `collect` node + form validation
- [ ] Form integrates cleanly with DAG interpreter
- [ ] Form answers accessible in task context via `inputs.form_id.*`
- [ ] Can validate form submissions against generated JSON Schema

### ✅ Phase 3 Complete When:
- [ ] `dag-transforms.ts` implements cycle detection, YAML serialization, Mermaid diagrams
- [ ] `docs/specs/effect-workflow.md` spec complete (following `effect-ci.md` pattern)
- [ ] `registry/registry.json` updated with all components
- [ ] 3-4 detailed examples documented
- [ ] Root `README.md` updated with effect-workflow section
- [ ] All examples run successfully in CI

---

## Project Structure

```
meta-effect/
├── packages/
│   └── registry/
│       ├── src/
│       │   ├── effect-workflow/
│       │   │   ├── dag-schema.ts              (~80 lines)
│       │   │   ├── dag-interpreter.ts         (~100 lines)
│       │   │   ├── dag-transforms.ts          (~70 lines)
│       │   │   ├── form-schema.ts             (~70 lines)
│       │   │   ├── form-to-json-schema.ts     (~60 lines)
│       │   │   ├── form-parser.ts             (~90 lines, optional)
│       │   │   └── compile-to-github-actions.ts (~100 lines)
│       │   ├── effect-ci/                     (existing)
│       │   ├── effect-vite/                   (existing)
│       │   └── effect-remix/                  (existing)
│       ├── examples/
│       │   └── workflow/
│       │       ├── release-basic.ts
│       │       ├── release-with-approval.ts
│       │       ├── incident-response.ts
│       │       └── onboarding.ts
│       ├── tests/
│       │   └── effect-workflow/
│       │       ├── dag-schema.test.ts
│       │       ├── dag-interpreter.test.ts
│       │       ├── dag-transforms.test.ts
│       │       └── form-to-json-schema.test.ts
│       └── registry.json
├── docs/
│   └── specs/
│       ├── effect-workflow.md                  (new)
│       ├── effect-ci.md                        (existing)
│       ├── effect-vite.md                      (existing)
│       └── effect-remix.md                     (existing)
└── README.md
```

---

## Timeline & Effort Estimates

### Phase 1: Core Workflow (2-3 days)
- Day 1: `dag-schema.ts` + basic builders + tests
- Day 2: `dag-interpreter.ts` + topological execution + tests
- Day 3: `compile-to-github-actions.ts` + `release-basic.ts` example

### Phase 2: Form Integration (1-2 days)
- Day 1: `form-schema.ts` + `form-to-json-schema.ts` + tests
- Day 2: Integrate collect nodes + `release-with-approval.ts` example

### Phase 3: Polish & Documentation (1-2 days)
- Day 1: `dag-transforms.ts` + validation + Mermaid diagrams
- Day 2: `effect-workflow.md` spec + registry updates + README

**Total Estimated Effort**: ~1 week (5-7 days) for production-ready vendorable components

---

## Risks & Mitigations

### Risk 1: Expression Evaluator Complexity
**Problem**: CEL/JEXL integration could balloon component size.

**Mitigation**: Start with stub; users provide implementation. Future: separate vendorable `cel-evaluator.ts` component.

---

### Risk 2: GitHub Actions Mapping Limitations
**Problem**: Some DAG constructs don't map cleanly to GHA (e.g., dynamic fanout).

**Mitigation**: Document limitations clearly. Provide escape hatch: users can customize `compile-to-github-actions.ts` after vendoring.

---

### Risk 3: Form Rendering Complexity
**Problem**: Multi-target form rendering (React, Svelte, Solid, etc.) could create maintenance burden.

**Mitigation**: Start with JSON Schema compiler only. Add React/Shadcn renderer as optional component later. Users can build custom renderers from FormIR.

---

### Risk 4: Cycle Detection Performance
**Problem**: Large DAGs (1000+ nodes) might slow down validation.

**Mitigation**: Use efficient cycle detection algorithm (DFS with color marking). Document O(V+E) complexity. Recommend keeping DAGs < 100 nodes for clarity.

---

## Future Enhancements (Post-v1)

### Entity DSL
- `entity-schema.ts` - Effect Schema for domain models with lifecycle states
- `entity-to-drizzle.ts` - Generate Drizzle ORM schemas
- `entity-to-prisma.ts` - Generate Prisma schemas

### Advanced Compilers
- `compile-to-step-functions.ts` - AWS Step Functions ASL
- `compile-to-temporal.ts` - Temporal workflow definitions
- `compile-to-cadence.ts` - Uber Cadence workflows

### Form Renderers
- `form-to-react-shadcn.ts` - React + shadcn/ui components
- `form-to-svelte.ts` - Svelte form components
- `form-to-html.ts` - Plain HTML forms

### Policy Integration
- `policy-opa.ts` - OPA (Open Policy Agent) integration
- `policy-cedar.ts` - AWS Cedar policy integration
- `assignee-resolver.ts` - Assignment rules with round-robin, SLA tracking

### Expression Evaluators
- `cel-evaluator.ts` - CEL (Common Expression Language)
- `jexl-evaluator.ts` - JEXL expression evaluator

---

## Philosophy Check

**✅ Minimal**: Each component 50-100 lines, focused on one concern

**✅ Vendorable**: Copy into project, users own and customize freely

**✅ Composable**: Components work together but can be used independently

**✅ Effect-first**: Every operation is an Effect; leverage Effect primitives (Schema, Service, Layer)

**✅ Framework-Aware**: Integrate with GitHub Actions, AWS, etc. without replacing them

**✅ Educational**: Code teaches Effect patterns through readable examples

**✅ Zero Magic**: All behavior explicit; no hidden abstractions

---

## Next Steps

1. **Review this plan** - Stakeholder feedback on architecture and scope
2. **Rename branch** - `effect-workflow-dsl` or `workflow-primitives`
3. **Begin Phase 1** - Start with `dag-schema.ts` implementation
4. **Create spec stub** - `docs/specs/effect-workflow.md` outline
5. **Set up testing** - Vitest config for new components

**Ready to begin implementation?** 🚀
