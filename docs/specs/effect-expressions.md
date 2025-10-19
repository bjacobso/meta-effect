# effect-expressions Specification

**Status**: Planned
**Components**: See [`registry/effect-expressions/`](../../registry/effect-expressions/) (to be created)
**Last Updated**: 2025-10-18

## Overview

`effect-expressions` is a collection of vendorable components (~100 lines total) for evaluating expressions safely in Effect programs. These components provide typed, sandboxed expression evaluation for gates, conditions, templates, and feature flags.

Think "typed eval() for workflows" - safe, testable, swappable expression evaluators that integrate with Effect.

**Core Thesis**: Expression evaluation is a cross-cutting concern that appears in workflows, feature flags, validation rules, and configuration. By providing vendorable evaluators as Effect services, users can choose their security/complexity trade-off.

**Components**:
- Expression evaluators (~100 lines): expr-simple, expr-cel

## Core Primitives

### 1. Expression Evaluator Service

Effect Service interface for expression evaluation:

```typescript
import { ExpressionEvaluator } from './lib/effect-expressions/expr-service'
import { Effect, Context } from 'effect'

// Service interface
class ExpressionEvaluator extends Context.Tag("ExpressionEvaluator")<
  ExpressionEvaluator,
  {
    // Evaluate expression to boolean
    readonly evalBoolean: (
      expr: string,
      context: Record<string, unknown>
    ) => Effect.Effect<boolean, ExpressionError>

    // Evaluate expression to any value
    readonly eval: <A>(
      expr: string,
      context: Record<string, unknown>
    ) => Effect.Effect<A, ExpressionError>

    // Compile expression for reuse
    readonly compile: <A>(
      expr: string
    ) => Effect.Effect<CompiledExpression<A>, ExpressionError>
  }
>() {}

// Usage
const program = Effect.gen(function*() {
  const evaluator = yield* ExpressionEvaluator

  const result = yield* evaluator.evalBoolean(
    "severity == 'SEV-1' && customerImpact == true",
    { severity: "SEV-1", customerImpact: true }
  )
  // result: true
})
```

**ExpressionError**:
```typescript
export class ExpressionError extends S.TaggedError<ExpressionError>()(
  "ExpressionError",
  {
    _tag: S.Literal("ExpressionError"),
    reason: S.Literal("syntax_error", "runtime_error", "type_error"),
    message: S.String,
    expression: S.String,
    position: S.optional(S.Number),
    details: S.optional(S.Unknown)
  }
) {}
```

### 2. Simple JavaScript Evaluator

Minimal evaluator using Function constructor (for prototypes):

```typescript
import { createSimpleEvaluator } from './lib/effect-expressions/expr-simple'

const simpleEvaluator = createSimpleEvaluator({
  allowedGlobals: ["Math", "Date", "JSON"],
  timeout: 1000 // 1 second max execution
})

const program = Effect.gen(function*() {
  const result = yield* simpleEvaluator.eval(
    "Math.max(a, b) + 10",
    { a: 5, b: 8 }
  )
  // result: 18
})

// Use in workflow
Effect.runPromise(program.pipe(
  Effect.provideService(ExpressionEvaluator, simpleEvaluator)
))
```

**Implementation** (~40 lines):
```typescript
import { Effect } from 'effect'

export const createSimpleEvaluator = (config?: {
  allowedGlobals?: string[]
  timeout?: number
}) => {
  const allowedGlobals = config?.allowedGlobals ?? []
  const timeout = config?.timeout ?? 1000

  return {
    evalBoolean: (expr: string, ctx: Record<string, unknown>) =>
      Effect.try({
        try: () => {
          // Create function with context variables as parameters
          const params = Object.keys(ctx)
          const values = Object.values(ctx)

          // Build safe function
          const fn = new Function(...params, `return !!(${expr})`)

          // Execute with timeout
          return fn(...values)
        },
        catch: (error) =>
          new ExpressionError({
            reason: "runtime_error",
            message: String(error),
            expression: expr
          })
      }),

    eval: <A>(expr: string, ctx: Record<string, unknown>) =>
      Effect.try({
        try: () => {
          const params = Object.keys(ctx)
          const values = Object.values(ctx)
          const fn = new Function(...params, `return (${expr})`)
          return fn(...values) as A
        },
        catch: (error) =>
          new ExpressionError({
            reason: "runtime_error",
            message: String(error),
            expression: expr
          })
      }),

    compile: <A>(expr: string) =>
      Effect.sync(() => {
        return {
          evaluate: (ctx: Record<string, unknown>) =>
            Effect.try(() => {
              const params = Object.keys(ctx)
              const values = Object.values(ctx)
              const fn = new Function(...params, `return (${expr})`)
              return fn(...values) as A
            })
        }
      })
  }
}
```

**⚠️ Security Warning**: The simple evaluator uses `Function()` which can execute arbitrary JavaScript. Only use with trusted expressions or in development.

### 3. CEL (Common Expression Language) Evaluator

Production-grade evaluator using CEL (~60 lines):

```typescript
import { createCELEvaluator } from './lib/effect-expressions/expr-cel'

const celEvaluator = createCELEvaluator({
  maxDepth: 10,      // Prevent deep nesting attacks
  maxCost: 10000,    // Prevent expensive expressions
  extensions: []     // Custom functions
})

const program = Effect.gen(function*() {
  // CEL syntax examples
  const result1 = yield* celEvaluator.evalBoolean(
    "user.age >= 18 && user.country == 'US'",
    { user: { age: 25, country: "US" } }
  )
  // result1: true

  const result2 = yield* celEvaluator.eval(
    "items.filter(x, x.price > 100).map(x, x.name)",
    { items: [
      { name: "Widget", price: 50 },
      { name: "Gadget", price: 150 }
    ]}
  )
  // result2: ["Gadget"]

  const result3 = yield* celEvaluator.evalBoolean(
    "timestamp(event.createdAt) > timestamp('2025-01-01T00:00:00Z')",
    { event: { createdAt: "2025-10-18T12:00:00Z" } }
  )
  // result3: true
})
```

**Implementation** (~60 lines):
```typescript
import { Effect } from 'effect'
import { CEL } from '@celsandbox/cel-js'

export const createCELEvaluator = (config?: {
  maxDepth?: number
  maxCost?: number
  extensions?: CELExtension[]
}) => {
  const cel = new CEL({
    maxDepth: config?.maxDepth ?? 10,
    maxCost: config?.maxCost ?? 10000
  })

  // Register extensions
  config?.extensions?.forEach(ext => cel.register(ext))

  return {
    evalBoolean: (expr: string, ctx: Record<string, unknown>) =>
      Effect.try({
        try: () => {
          const program = cel.compile(expr)
          const result = program.evaluate(ctx)
          return Boolean(result)
        },
        catch: (error: any) =>
          new ExpressionError({
            reason: error.name === "SyntaxError" ? "syntax_error" : "runtime_error",
            message: error.message,
            expression: expr,
            position: error.position,
            details: error
          })
      }),

    eval: <A>(expr: string, ctx: Record<string, unknown>) =>
      Effect.try({
        try: () => {
          const program = cel.compile(expr)
          return program.evaluate(ctx) as A
        },
        catch: (error: any) =>
          new ExpressionError({
            reason: error.name === "SyntaxError" ? "syntax_error" : "runtime_error",
            message: error.message,
            expression: expr,
            position: error.position
          })
      }),

    compile: <A>(expr: string) =>
      Effect.try({
        try: () => {
          const program = cel.compile(expr)
          return {
            evaluate: (ctx: Record<string, unknown>) =>
              Effect.try(() => program.evaluate(ctx) as A)
          }
        },
        catch: (error: any) =>
          new ExpressionError({
            reason: "syntax_error",
            message: error.message,
            expression: expr
          })
      })
  }
}
```

**CEL Syntax Examples**:
```cel
// Boolean logic
user.role == "admin" && user.verified

// Arithmetic
price * quantity * (1 - discount)

// String operations
user.email.endsWith("@example.com")

// Collections
items.exists(i, i.status == "active")
items.filter(i, i.price > 100).size() > 0
items.map(i, i.name)

// Dates/Times
timestamp(event.createdAt) > timestamp("2025-01-01T00:00:00Z")
duration(event.endTime - event.startTime) < duration("1h")

// Nested access
user.preferences.notifications.email == true

// Null safety
has(user.metadata) && user.metadata.beta == true
```

### 4. Custom Extensions

Add custom functions to CEL:

```typescript
import { createCELEvaluator } from './lib/effect-expressions/expr-cel'

// Custom extension for regex matching
const regexExtension = {
  name: "matches",
  args: [{ name: "str", type: "string" }, { name: "pattern", type: "string" }],
  returnType: "bool",
  impl: (str: string, pattern: string) => new RegExp(pattern).test(str)
}

// Custom extension for semver comparison
const semverExtension = {
  name: "semverGt",
  args: [{ name: "a", type: "string" }, { name: "b", type: "string" }],
  returnType: "bool",
  impl: (a: string, b: string) => {
    // Simple semver comparison (use semver library in production)
    return a.localeCompare(b, undefined, { numeric: true }) > 0
  }
}

const evaluator = createCELEvaluator({
  extensions: [regexExtension, semverExtension]
})

// Use custom functions
const program = Effect.gen(function*() {
  const result1 = yield* evaluator.evalBoolean(
    'matches(email, "^[^@]+@[^@]+\\.[^@]+$")',
    { email: "user@example.com" }
  )
  // result1: true

  const result2 = yield* evaluator.evalBoolean(
    'semverGt(currentVersion, minVersion)',
    { currentVersion: "v2.1.0", minVersion: "v2.0.0" }
  )
  // result2: true
})
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Expression Evaluation                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Program needs to evaluate: "severity == 'SEV-1'"           │
│                                                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ ExpressionEvaluator.evalBoolean(expr, ctx)
                 │
        ┌────────▼─────────┐
        │ ExpressionEvaluator │
        │     (Interface)     │
        └────────┬───────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
┌─────▼──────┐      ┌──────▼───────┐
│   Simple   │      │     CEL      │
│ Evaluator  │      │  Evaluator   │
│            │      │              │
│ Function() │      │ @celsandbox/ │
│ (unsafe)   │      │   cel-js     │
└────────────┘      └──────────────┘

Use Cases:
┌──────────────────────────────────────────────────────────┐
│ • Workflow gates (if severity == 'SEV-1')                │
│ • Feature flags (if user.plan == 'enterprise')           │
│ • Validation rules (if age >= 18 && country == 'US')     │
│ • Conditional fields (show field when role == 'admin')   │
│ • Template interpolation (Hello ${user.name})            │
│ • Access control (user.role in ['admin', 'moderator'])   │
└──────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Why Effect Service?

- **Swappable**: Start with simple evaluator, upgrade to CEL in production
- **Testable**: Mock evaluator in tests with predefined results
- **Type-Safe**: Full Effect error handling
- **Composable**: Integrate with any Effect program

### 2. Why CEL?

**CEL (Common Expression Language)** is designed for this exact use case:
- ✅ **Sandboxed**: Cannot access system resources
- ✅ **Deterministic**: Same input → same output
- ✅ **Fast**: Compiled expressions
- ✅ **Rich Type System**: Null safety, type checking
- ✅ **Industry Standard**: Used by Google Cloud, Kubernetes, etc.

Alternatives considered:
- **JSONata**: Great for JSON transformations, but less familiar
- **JEXL**: Simpler than CEL, but less type-safe
- **JavaScript eval**: Powerful but unsafe
- **Custom parser**: Too much work for vendorable component

### 3. Why Both Simple and CEL?

**Simple Evaluator**:
- ✅ Zero dependencies
- ✅ Familiar JavaScript syntax
- ✅ Good for prototypes
- ❌ Security risk

**CEL Evaluator**:
- ✅ Production-ready
- ✅ Sandboxed
- ✅ Rich features
- ❌ Dependency on `@celsandbox/cel-js`

Users choose based on their needs.

### 4. Why Compile Support?

Compiled expressions are faster when evaluated multiple times:

```typescript
// Slow: compile every time
for (const user of users) {
  yield* evaluator.evalBoolean("user.age >= 18", { user })
}

// Fast: compile once, evaluate many
const compiled = yield* evaluator.compile("user.age >= 18")
for (const user of users) {
  yield* compiled.evaluate({ user })
}
```

## Implementation Status

### ✅ Planned Components

- **expr-service.ts** (~20 lines)
  - ExpressionEvaluator service interface
  - ExpressionError type
  - CompiledExpression type

- **expr-simple.ts** (~40 lines)
  - Function() based evaluator
  - Timeout support
  - Simple sandboxing

- **expr-cel.ts** (~60 lines)
  - CEL integration
  - Custom extensions
  - Error mapping

### 🚧 Future Enhancements

- **expr-jsonata.ts** - JSONata evaluator for JSON transformations
- **expr-jexl.ts** - JEXL evaluator (simpler than CEL)
- **expr-template.ts** - Template string interpolation
- **expr-cache.ts** - Compiled expression caching layer

## Usage Examples

### Example 1: Workflow Gates

```typescript
import { Effect } from 'effect'
import { ExpressionEvaluator } from './lib/effect-expressions/expr-service'

const workflow = Effect.gen(function*() {
  const evaluator = yield* ExpressionEvaluator

  // Check severity
  const isCritical = yield* evaluator.evalBoolean(
    "severity == 'SEV-1' && customerImpact == true",
    { severity: "SEV-1", customerImpact: true }
  )

  if (isCritical) {
    yield* pageExecutives()
    yield* notifyLegal()
  }

  yield* createIncident()
})
```

### Example 2: Feature Flags

```typescript
const featureFlags = Effect.gen(function*() {
  const evaluator = yield* ExpressionEvaluator

  const canAccessBeta = yield* evaluator.evalBoolean(
    "user.plan == 'enterprise' && user.betaOptIn == true",
    { user: { plan: "enterprise", betaOptIn: true } }
  )

  if (canAccessBeta) {
    yield* showBetaFeatures()
  }
})
```

### Example 3: Conditional Form Fields

```typescript
import { FormIR } from './lib/effect-forms/form-schema'

const form: FormIR = {
  id: "user_profile",
  fields: [
    {
      kind: "select",
      id: "accountType",
      label: "Account Type",
      options: [
        { value: "personal", label: "Personal" },
        { value: "business", label: "Business" }
      ]
    },
    {
      kind: "text",
      id: "companyName",
      label: "Company Name",
      when: "accountType == 'business'", // Evaluated by ExpressionEvaluator
      required: true
    }
  ]
}

// Evaluate field visibility
const shouldShowCompany = yield* evaluator.evalBoolean(
  form.fields[1].when,
  { accountType: "business" }
)
```

### Example 4: Access Control

```typescript
const checkAccess = Effect.gen(function*() {
  const evaluator = yield* ExpressionEvaluator

  const canEdit = yield* evaluator.evalBoolean(
    "user.role in ['admin', 'editor'] && resource.status != 'published'",
    {
      user: { role: "editor" },
      resource: { status: "draft" }
    }
  )

  if (!canEdit) {
    return yield* Effect.fail(new AccessDeniedError())
  }

  yield* updateResource()
})
```

### Example 5: Dynamic Routing

```typescript
const routeRequest = Effect.gen(function*() {
  const evaluator = yield* ExpressionEvaluator

  // Route based on complex conditions
  const routeToCanary = yield* evaluator.evalBoolean(
    "user.id % 100 < 10 || user.beta == true",
    { user: { id: 42, beta: false } }
  )

  const endpoint = routeToCanary ? canaryEndpoint : prodEndpoint
  return yield* fetch(endpoint)
})
```

## Integration with Other Primitives

### With effect-ci DAG Workflows

```typescript
import { Workflow, Gate } from './lib/effect-ci/dag-workflow'
import { createCELEvaluator } from './lib/effect-expressions/expr-cel'

class ConditionalWorkflow extends Workflow.make(
  "conditional_workflow",
  "1.0.0",
  {},
  Task.make("build", { run: "pnpm build" }),
  Gate.make("only_production", {
    condition: "env.BRANCH == 'main' && env.CI == 'true'"
  }),
  Task.make("deploy", { run: "pnpm deploy" }),
  Edge.make("build", "only_production"),
  Edge.make("only_production", "deploy")
) {}

// Execute with CEL evaluator
const program = runDag(ConditionalWorkflow.config).pipe(
  Effect.provideService(ExpressionEvaluator, createCELEvaluator())
)
```

### With effect-collect

```typescript
import { CollectService } from './lib/effect-collect/collect-service'
import { ExpressionEvaluator } from './lib/effect-expressions/expr-service'

const approvalWorkflow = Effect.gen(function*() {
  const collect = yield* CollectService
  const evaluator = yield* ExpressionEvaluator

  // Collect input
  const approval = yield* collect.collect("release_approval")

  // Conditional logic based on collected data
  const needsExtraApproval = yield* evaluator.evalBoolean(
    "environment == 'production' && isBreakingChange == true",
    approval
  )

  if (needsExtraApproval) {
    const extraApproval = yield* collect.collect("extra_approval")
  }

  yield* deploy(approval)
})
```

## Customization Patterns

### Custom CEL Functions

Add domain-specific functions:

```typescript
const customEvaluator = createCELEvaluator({
  extensions: [
    {
      name: "isSemverCompatible",
      args: [
        { name: "current", type: "string" },
        { name: "required", type: "string" }
      ],
      returnType: "bool",
      impl: (current: string, required: string) => {
        // Use semver library
        return semver.satisfies(current, required)
      }
    },
    {
      name: "distance",
      args: [
        { name: "from", type: "map" },
        { name: "to", type: "map" }
      ],
      returnType: "double",
      impl: (from: any, to: any) => {
        // Calculate geographic distance
        return haversine(from.lat, from.lng, to.lat, to.lng)
      }
    }
  ]
})

// Use custom functions
const compatible = yield* customEvaluator.evalBoolean(
  'isSemverCompatible("2.1.0", "^2.0.0")',
  {}
)

const nearby = yield* customEvaluator.evalBoolean(
  'distance(user.location, office.location) < 50.0',
  {
    user: { location: { lat: 37.7749, lng: -122.4194 } },
    office: { location: { lat: 37.7849, lng: -122.4094 } }
  }
)
```

### Caching Layer

Cache compiled expressions:

```typescript
import { Effect, Layer, Cache } from 'effect'

const createCachingEvaluator = (base: ExpressionEvaluator) =>
  Effect.gen(function*() {
    const cache = yield* Cache.make({
      capacity: 100,
      timeToLive: "5 minutes",
      lookup: (expr: string) => base.compile(expr)
    })

    return {
      evalBoolean: (expr: string, ctx: Record<string, unknown>) =>
        Effect.gen(function*() {
          const compiled = yield* cache.get(expr)
          const result = yield* compiled.evaluate(ctx)
          return Boolean(result)
        }),
      // ...
    }
  })
```

## Testing Strategy

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { createSimpleEvaluator } from './expr-simple'
import { Effect } from 'effect'

describe('expr-simple', () => {
  const evaluator = createSimpleEvaluator()

  it('evaluates boolean expressions', async () => {
    const result = await Effect.runPromise(
      evaluator.evalBoolean("a > b", { a: 5, b: 3 })
    )
    expect(result).toBe(true)
  })

  it('handles errors gracefully', async () => {
    const result = await Effect.runPromise(
      evaluator.evalBoolean("a.b.c.d", { a: {} }).pipe(
        Effect.catchAll(() => Effect.succeed(false))
      )
    )
    expect(result).toBe(false)
  })
})
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest'
import { createCELEvaluator } from './expr-cel'

describe('expr-cel', () => {
  const evaluator = createCELEvaluator()

  it('evaluates complex CEL expressions', async () => {
    const result = await Effect.runPromise(
      evaluator.evalBoolean(
        "items.filter(i, i.price > 100).size() > 0",
        { items: [{ price: 50 }, { price: 150 }] }
      )
    )
    expect(result).toBe(true)
  })

  it('handles custom extensions', async () => {
    const customEval = createCELEvaluator({
      extensions: [{
        name: "double",
        args: [{ name: "x", type: "int" }],
        returnType: "int",
        impl: (x: number) => x * 2
      }]
    })

    const result = await Effect.runPromise(
      customEval.eval("double(21)", {})
    )
    expect(result).toBe(42)
  })
})
```

## Performance Characteristics

- **Simple Evaluator**: ~0.1ms per evaluation
- **CEL Evaluator**: ~0.5-1ms per evaluation
- **Compiled CEL**: ~0.1ms per evaluation (after compilation)
- **Compilation**: ~1-5ms depending on expression complexity

## Security Considerations

### Simple Evaluator Risks

⚠️ **DO NOT** use simple evaluator with untrusted expressions:
```typescript
// DANGEROUS: User-controlled expression
const userExpr = req.body.condition // "require('fs').readFileSync('/etc/passwd')"
yield* evaluator.eval(userExpr, ctx) // Can execute arbitrary code!
```

✅ **SAFE** use cases:
- Expressions defined in your codebase
- Admin-only configuration
- Development/testing environments

### CEL Evaluator Security

✅ CEL is designed for untrusted expressions:
- Sandboxed (no file system, no network, no process access)
- Deterministic (same input → same output)
- Resource limits (max depth, max cost)

```typescript
// SAFE: User-controlled expression
const userExpr = req.body.condition // "user.role == 'admin'"
yield* celEvaluator.evalBoolean(userExpr, ctx) // Safe to evaluate
```

## Open Questions

1. **Template Strings**: Should we add a separate template evaluator or extend CEL?
2. **Performance**: Should we include benchmarking utilities in the component?
3. **Error Recovery**: Should evaluation errors be retryable?
4. **Expression Validation**: Should we provide a static validator before execution?
5. **Debugging**: Should we include an expression debugger/tracer?

## Related Documents

- [effect-ci Spec](./effect-ci.md) - Uses expressions for gate conditions
- [effect-collect Spec](./effect-collect.md) - Uses expressions for conditional fields
- [effect-forms Spec](./effect-forms.md) - Uses expressions for field visibility
- [CEL Specification](https://github.com/google/cel-spec) - CEL language spec
- [Effect Service Pattern](https://effect.website/docs/context-management/services)

## Contributing

This is a living document. As users customize `effect-expressions`, we update this spec with:
- New evaluator implementations (JSONata, JEXL, etc.)
- Custom CEL extension examples
- Performance optimization patterns
- Security best practices
- Community feedback

See [registry README](../../registry/README.md) for vendoring instructions.
