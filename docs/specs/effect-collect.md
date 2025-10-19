# effect-collect Specification

**Status**: Planned
**Components**: See [`registry/effect-collect/`](../../registry/effect-collect/) (to be created)
**Last Updated**: 2025-10-18

## Overview

`effect-collect` is a collection of vendorable components (~120 lines total) for pausing Effect programs to collect human input. These components bridge `effect-forms` schemas with workflow execution, enabling approval gates, configuration collection, and interactive CLIs.

Think "Effect.interrupt but for human input" - typed, resumable, composable primitives for human-in-the-loop patterns.

**Core Thesis**: Human input is a legitimate effect that should be modeled explicitly in Effect programs. By treating collection as a service dependency, we get type-safe, testable, mockable human interaction.

**Components**:
- Collection primitives (~120 lines): collect-node, collect-service

## Core Primitives

### 1. Collect Node Schema

Effect Schema type for collection points in workflows:

```typescript
import { CollectNode } from './lib/effect-collect/collect-node'
import { Schema as S } from '@effect/schema/Schema'

// Basic collect node
const approvalNode: CollectNode = {
  _tag: "collect",
  id: "release_approval" as NodeId,
  formId: "release_form",
  timeout: 3600000, // 1 hour in ms
  sla: {
    warnAfterMs: 300000,  // Warn after 5 min
    escalateAfterMs: 600000  // Escalate after 10 min
  }
}

// With retry policy
const configNode: CollectNode = {
  _tag: "collect",
  id: "gather_config",
  formId: "deployment_config",
  retry: {
    maxAttempts: 3,
    backoff: {
      _tag: "exponential",
      baseDelayMs: 1000,
      factor: 2,
      maxDelayMs: 10000
    }
  },
  validation: "strict" // or "lenient"
}
```

**Schema Definition**:
```typescript
export const NodeId = S.NonEmptyString.pipe(S.brand("NodeId"))

export class CollectNode extends S.Class<CollectNode>("CollectNode")({
  _tag: S.Literal("collect"),
  id: NodeId,
  formId: S.String, // References FormIR.id
  timeout: S.optional(S.Number), // milliseconds
  sla: S.optional(S.Struct({
    warnAfterMs: S.Number,
    escalateAfterMs: S.Number
  })),
  retry: S.optional(RetryPolicy),
  validation: S.optional(S.Literal("strict", "lenient")),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown }))
}) {}
```

### 2. Collect Service

Effect Service for collecting input during program execution:

```typescript
import { CollectService } from './lib/effect-collect/collect-service'
import { Effect, Context } from 'effect'

// Service interface
class CollectService extends Context.Tag("CollectService")<
  CollectService,
  {
    // Core collection operation
    readonly collect: <A>(
      formId: string,
      schema?: Schema.Schema<A, unknown>,
      options?: CollectOptions
    ) => Effect.Effect<A, CollectError>

    // Check if collection is pending
    readonly isPending: (formId: string) => Effect.Effect<boolean>

    // Cancel pending collection
    readonly cancel: (formId: string) => Effect.Effect<void>

    // Resume with provided data
    readonly resume: <A>(formId: string, data: A) => Effect.Effect<void>
  }
>() {}

// Usage in Effect program
const program = Effect.gen(function*() {
  const collect = yield* CollectService

  // Collect approval
  const approval = yield* collect.collect("release_approval", ReleaseApprovalSchema)

  // Use collected data
  console.log(`Approved version: ${approval.version}`)
  console.log(`Deploy to: ${approval.environment}`)

  // Continue workflow
  yield* deployToEnvironment(approval.environment, approval.version)
})
```

**CollectOptions**:
```typescript
export interface CollectOptions {
  timeout?: number
  retry?: RetryPolicy
  validation?: "strict" | "lenient"
  onTimeout?: () => Effect.Effect<unknown>
  onValidationError?: (errors: unknown[]) => Effect.Effect<unknown>
}
```

**CollectError**:
```typescript
export class CollectError extends S.TaggedError<CollectError>()("CollectError", {
  _tag: S.Literal("CollectError"),
  reason: S.Literal("timeout", "cancelled", "validation_failed"),
  message: S.String,
  formId: S.String,
  details: S.optional(S.Unknown)
}) {}
```

### 3. Collection Strategies

Different strategies for collecting input:

#### CLI Prompt Strategy

```typescript
import { createCLICollector } from './lib/effect-collect/strategies/cli'
import { FormIR } from './lib/effect-forms/form-schema'
import prompts from 'prompts'

const cliCollector = createCLICollector({
  promptLib: prompts, // or inquirer, enquirer, etc.
})

const program = Effect.gen(function*() {
  const approval = yield* collect.collect("release_approval")
  // Prompts user in terminal:
  // ? Version Tag: v1.2.3
  // ? Target Environment: (Use arrow keys)
  //   ❯ staging
  //     production
})

// Provide service
Effect.runPromise(program.pipe(
  Effect.provideService(CollectService, cliCollector)
))
```

#### GitHub Actions Strategy

```typescript
import { createGitHubActionsCollector } from './lib/effect-collect/strategies/github-actions'

const ghaCollector = createGitHubActionsCollector({
  // Reads from workflow_dispatch inputs
  getInputs: () => ({
    version: process.env.INPUT_VERSION,
    environment: process.env.INPUT_ENVIRONMENT
  })
})

const program = Effect.gen(function*() {
  const approval = yield* collect.collect("release_approval")
  // Reads from GitHub Actions inputs (no actual prompt)
})
```

#### HTTP/Webhook Strategy

```typescript
import { createWebhookCollector } from './lib/effect-collect/strategies/webhook'

const webhookCollector = createWebhookCollector({
  webhookUrl: "https://api.example.com/approvals",
  pollInterval: 5000, // Check every 5 seconds
  timeout: 3600000    // 1 hour
})

const program = Effect.gen(function*() {
  const approval = yield* collect.collect("release_approval")
  // POST to webhook, poll for response
})
```

#### Slack Strategy

```typescript
import { createSlackCollector } from './lib/effect-collect/strategies/slack'

const slackCollector = createSlackCollector({
  botToken: process.env.SLACK_BOT_TOKEN,
  channel: "#approvals",
  formRenderer: (form) => slackBlockKit(form)
})

const program = Effect.gen(function*() {
  const approval = yield* collect.collect("release_approval")
  // Posts interactive message to Slack, waits for response
})
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Effect Program Execution                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Effect.gen(function*() {                                   │
│    yield* task1()                                           │
│                                                              │
│    // PAUSE: Collect human input                            │
│    const data = yield* collect.collect("form_id")          │
│                                                              │
│    yield* task2(data)  // Resume with collected data       │
│  })                                                          │
│                                                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ collect.collect("form_id")
                 │
        ┌────────▼─────────┐
        │  CollectService  │
        │   (Interface)    │
        └────────┬─────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
┌─────▼──────┐      ┌──────▼───────┐
│  Strategy  │      │   Strategy   │
│    CLI     │      │ GitHub Actions│
└─────┬──────┘      └──────┬───────┘
      │                    │
┌─────▼──────┐      ┌──────▼───────┐
│  prompts   │      │ workflow     │
│  library   │      │ inputs       │
└────────────┘      └──────────────┘

┌─────────────┐      ┌──────────────┐
│  Strategy   │      │   Strategy   │
│   Webhook   │      │    Slack     │
└─────┬───────┘      └──────┬───────┘
      │                     │
┌─────▼──────┐      ┌───────▼──────┐
│ HTTP POST  │      │ Slack API    │
│ + polling  │      │ interactive  │
└────────────┘      └──────────────┘
```

## Key Design Decisions

### 1. Why Effect Service Pattern?

- **Dependency Injection**: Swap strategies without changing business logic
- **Testable**: Mock collection in tests
- **Type-Safe**: Full inference for collected data
- **Composable**: Collection is just another effect

### 2. Why Separate from Forms?

Forms define **structure**, Collect defines **execution**:
- **effect-forms**: "What data to collect" (schema)
- **effect-collect**: "How to collect data" (runtime strategy)

This separation enables:
- Forms without collection (validation, code gen)
- Collection without forms (arbitrary schemas)
- Mix and match strategies

### 3. Why Strategy Pattern?

Different environments need different collection mechanisms:
- **Local dev**: CLI prompts
- **CI/CD**: GitHub Actions inputs
- **Production**: Webhook callbacks
- **Internal tools**: Slack approval bots

Single interface, swappable implementations.

### 4. Why Timeout/SLA Support?

Human input is unreliable:
- **Timeout**: Prevent infinite wait
- **SLA Warning**: Notify after N minutes
- **SLA Escalation**: Auto-approve or fail-safe after M minutes
- **Retry**: Re-prompt on validation failure

## Implementation Status

### ✅ Planned Components

- **collect-node.ts** (~50 lines)
  - CollectNode schema with timeout/SLA/retry
  - Integration with effect-dag workflows
  - Metadata support for tracking

- **collect-service.ts** (~70 lines)
  - CollectService Effect.Service
  - Core `collect()` operation
  - Pending/cancel/resume operations
  - Error types and handling

### 🚧 Future Enhancements

- **strategies/cli.ts** - Terminal prompt strategy
- **strategies/github-actions.ts** - GHA input strategy
- **strategies/webhook.ts** - HTTP callback strategy
- **strategies/slack.ts** - Slack interactive message strategy
- **strategies/discord.ts** - Discord bot strategy
- **strategies/email.ts** - Email approval links
- **collect-store.ts** - Persistent storage for resumable collection

## Usage Examples

### Example 1: Approval Gate in Release Workflow

```typescript
import { Effect } from 'effect'
import { CollectService } from './lib/effect-collect/collect-service'
import { FormIR } from './lib/effect-forms/form-schema'

const releaseForm: FormIR = {
  id: "release_approval",
  fields: [
    { kind: "text", id: "version", label: "Version", required: true },
    { kind: "select", id: "environment", label: "Environment",
      options: [
        { value: "staging", label: "Staging" },
        { value: "production", label: "Production" }
      ],
      required: true
    }
  ]
}

const releaseWorkflow = Effect.gen(function*() {
  const collect = yield* CollectService

  // Build artifacts
  console.log("Building...")
  yield* Effect.sleep(2000)
  console.log("✓ Build complete")

  // Collect approval
  console.log("Waiting for approval...")
  const approval = yield* collect.collect("release_approval", ReleaseApprovalSchema, {
    timeout: 3600000, // 1 hour
    onTimeout: () => Effect.fail(new Error("Approval timed out"))
  })

  // Deploy
  console.log(`Deploying ${approval.version} to ${approval.environment}...`)
  yield* Effect.sleep(5000)
  console.log("✓ Deployment complete")
})

// Run with CLI strategy
import { createCLICollector } from './lib/effect-collect/strategies/cli'

Effect.runPromise(releaseWorkflow.pipe(
  Effect.provideService(CollectService, createCLICollector())
))
```

### Example 2: Interactive Configuration CLI

```typescript
const configureProject = Effect.gen(function*() {
  const collect = yield* CollectService

  // Project setup
  const projectConfig = yield* collect.collect("project_setup", ProjectConfigSchema)

  // Database config (conditional)
  if (projectConfig.needsDatabase) {
    const dbConfig = yield* collect.collect("database_config", DatabaseConfigSchema)
    yield* setupDatabase(dbConfig)
  }

  // API keys (with retry on validation failure)
  const apiKeys = yield* collect.collect("api_keys", ApiKeysSchema, {
    retry: { maxAttempts: 3 },
    validation: "strict",
    onValidationError: (errors) =>
      Effect.sync(() => console.error("Invalid API keys:", errors))
  })

  // Generate project
  yield* generateProject({ ...projectConfig, dbConfig, apiKeys })
})
```

### Example 3: Multi-Stage Incident Response

```typescript
const incidentResponse = Effect.gen(function*() {
  const collect = yield* CollectService

  // Triage
  const triage = yield* collect.collect("incident_triage", IncidentTriageSchema)

  // Create incident
  const incident = yield* createIncident(triage)

  // If SEV-1, get executive approval for communications
  if (triage.severity === "SEV-1") {
    yield* pageExecutives(incident.id)

    const commApproval = yield* collect.collect("comms_approval", CommsApprovalSchema, {
      timeout: 900000, // 15 minutes
      sla: {
        warnAfterMs: 300000,    // Warn after 5 min
        escalateAfterMs: 600000 // Auto-approve after 10 min
      }
    })

    if (commApproval.approved) {
      yield* publishStatusPage(incident.id, commApproval.message)
    }
  }

  // Post-incident form
  yield* resolveIncident(incident.id)

  const postmortem = yield* collect.collect("postmortem", PostmortemSchema)
  yield* createPostmortem(incident.id, postmortem)
})
```

### Example 4: Testing with Mock Collector

```typescript
import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'

const mockCollector = {
  collect: <A>(formId: string) =>
    Effect.sync(() => {
      // Return mock data based on formId
      if (formId === "release_approval") {
        return { version: "v1.0.0", environment: "staging" }
      }
      return {}
    }),
  isPending: () => Effect.succeed(false),
  cancel: () => Effect.void,
  resume: () => Effect.void
}

describe('releaseWorkflow', () => {
  it('deploys after approval', () =>
    Effect.runPromise(
      releaseWorkflow.pipe(
        Effect.provideService(CollectService, mockCollector)
      )
    ).then(result => {
      expect(result).toBe("deployment complete")
    })
  )
})
```

## Integration with effect-dag Workflows

Collect nodes integrate seamlessly with DAG workflows:

```typescript
import { Workflow, Task, Edge } from './lib/effect-dag/dag-workflow'
import { Collect } from './lib/effect-collect/collect-node'

class ReleaseWithApproval extends Workflow.make(
  "release_with_approval",
  "1.0.0",
  {},
  Task.make("build", { run: "pnpm build" }),
  Task.make("test", { run: "pnpm test" }),

  // Collect node - pauses workflow for human input
  Collect.make("approval", {
    formId: "release_approval",
    timeout: 3600000,
    sla: { warnAfterMs: 300000, escalateAfterMs: 600000 }
  }),

  Task.make("deploy", { run: "pnpm deploy" }),

  Edge.make("build", "test"),
  Edge.make("test", "approval"),
  Edge.make("approval", "deploy")
) {}

// Execute with collect service
import { runDag } from './lib/effect-dag/dag-interpreter'

const program = runDag(ReleaseWithApproval.config).pipe(
  Effect.provideService(CollectService, createSlackCollector({
    channel: "#releases"
  }))
)
```

## Customization Patterns

### Custom Collection Strategy

Create a custom strategy for your environment:

```typescript
// strategies/linear.ts
import { Effect } from 'effect'
import { LinearClient } from '@linear/sdk'

export const createLinearCollector = (config: {
  apiKey: string
  teamId: string
}) => {
  const client = new LinearClient({ apiKey: config.apiKey })

  return {
    collect: <A>(formId: string, schema?: Schema.Schema<A>) =>
      Effect.gen(function*() {
        // Create Linear issue with form as description
        const issue = yield* Effect.promise(() =>
          client.createIssue({
            teamId: config.teamId,
            title: `Approval Required: ${formId}`,
            description: "Please fill out the form..."
          })
        )

        // Poll for comment with form data
        const data = yield* pollForResponse(issue.id)

        // Validate against schema
        if (schema) {
          return yield* Effect.try(() => S.decodeUnknownSync(schema)(data))
        }

        return data as A
      }),
    // ... other methods
  }
}
```

### Persistent Collection State

Store collection state for resumability:

```typescript
import { Effect } from 'effect'
import { PrismaClient } from '@prisma/client'

export const createPersistentCollector = (prisma: PrismaClient) => {
  return {
    collect: <A>(formId: string, schema?: Schema.Schema<A>) =>
      Effect.gen(function*() {
        // Check if already collected
        const existing = yield* Effect.promise(() =>
          prisma.collectionState.findUnique({ where: { formId } })
        )

        if (existing?.data) {
          return existing.data as A
        }

        // Create pending state
        yield* Effect.promise(() =>
          prisma.collectionState.create({
            data: { formId, status: "pending", createdAt: new Date() }
          })
        )

        // Wait for resume
        const data = yield* waitForResume(formId)

        // Store result
        yield* Effect.promise(() =>
          prisma.collectionState.update({
            where: { formId },
            data: { status: "completed", data, completedAt: new Date() }
          })
        )

        return data
      }),

    resume: <A>(formId: string, data: A) =>
      Effect.gen(function*() {
        yield* Effect.promise(() =>
          prisma.collectionState.update({
            where: { formId },
            data: { data, status: "completed" }
          })
        )
        yield* notifyWaiters(formId, data)
      })
  }
}
```

### SLA Escalation

Implement custom escalation logic:

```typescript
const collectorWithEscalation = {
  collect: <A>(formId: string, schema?: Schema.Schema<A>, options?: CollectOptions) =>
    Effect.gen(function*() {
      const startTime = Date.now()

      // Start collection
      const collectionFiber = yield* Effect.fork(
        actualCollection(formId, schema)
      )

      // SLA monitoring
      if (options?.sla) {
        yield* Effect.fork(
          Effect.gen(function*() {
            // Warn
            yield* Effect.sleep(options.sla.warnAfterMs)
            if (yield* isPending(formId)) {
              yield* sendWarning(formId)
            }

            // Escalate
            yield* Effect.sleep(
              options.sla.escalateAfterMs - options.sla.warnAfterMs
            )
            if (yield* isPending(formId)) {
              yield* escalate(formId) // Auto-approve or notify manager
            }
          })
        )
      }

      return yield* Effect.join(collectionFiber)
    })
}
```

## Testing Strategy

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { CollectNode } from './collect-node'
import { Schema as S } from '@effect/schema/Schema'

describe('collect-node', () => {
  it('validates well-formed collect node', () => {
    const node: CollectNode = {
      _tag: "collect",
      id: "test" as NodeId,
      formId: "test_form"
    }

    const result = S.decodeUnknownSync(CollectNode)(node)
    expect(result.formId).toBe("test_form")
  })
})
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { createCLICollector } from './strategies/cli'

describe('collect-service', () => {
  it('collects data from mock prompts', async () => {
    const mockCollector = createCLICollector({
      promptLib: {
        prompt: async () => ({ version: "v1.0.0" })
      }
    })

    const program = Effect.gen(function*() {
      const collect = yield* CollectService
      const data = yield* collect.collect("test")
      return data
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provideService(CollectService, mockCollector))
    )

    expect(result.version).toBe("v1.0.0")
  })
})
```

## Performance Characteristics

- **Service Overhead**: ~1ms (dependency injection)
- **CLI Strategy**: Synchronous (blocks on user input)
- **Webhook Strategy**: Polling interval dependent (5-30s typical)
- **Slack Strategy**: 1-5s latency (Slack API)

## Open Questions

1. **State Persistence**: Should we include a default persistence layer (SQLite)?
2. **Multi-User Approval**: How to handle "any 2 of 5 engineers" approval?
3. **Cancellation**: Should cancelled collections be retryable?
4. **Form Versioning**: How to handle form schema changes for pending collections?
5. **Audit Trail**: Should we include built-in audit logging?

## Related Documents

- [effect-forms Spec](./effect-forms.md) - Form schema definitions
- [effect-dag Spec](./effect-dag.md) - DAG workflow integration
- [Effect Service Pattern](https://effect.website/docs/context-management/services) - Service documentation
- [Effect Interruption](https://effect.website/docs/interruption-model) - Interruption model

## Contributing

This is a living document. As users customize `effect-collect`, we update this spec with:
- New collection strategies (Discord, Teams, Linear, etc.)
- Persistence patterns
- SLA/escalation examples
- Community feedback

See [registry README](../../registry/README.md) for vendoring instructions.
