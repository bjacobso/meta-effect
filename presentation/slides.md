---
theme: default
background: https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072
class: text-center
highlighter: shiki
lineNumbers: true
info: |
  ## Meta Effect
  Vendorable Effect Components for Web Frameworks

  Presented at Effect SF Meetup
drawings:
  persist: false
transition: slide-left
title: Meta Effect
mdc: true
---

# Meta Effect

Vendorable Effect Components for Web Frameworks

<div class="pt-12">
  <span @click="$slidev.nav.next" class="px-2 py-1 rounded cursor-pointer" hover="bg-white bg-opacity-10">
    Press Space for next page <carbon:arrow-right class="inline"/>
  </span>
</div>

---
layout: center
class: text-center
---

# What if Effect integrations worked like shadcn/ui?

<v-click>

## Copy. Paste. Own.

</v-click>

---
layout: two-cols
---

# The Problem

Traditional frameworks lock you in:

<v-clicks>

- **npm packages** create version dependencies
- **Frameworks** dictate your architecture
- **Abstractions** hide the Effect primitives
- **Updates** require migration

</v-clicks>

::right::

<v-click>

# The Meta Effect Way

Vendorable components give you control:

- **Copy** the code directly
- **Own** the implementation
- **Customize** without forking
- **Learn** from minimal examples

</v-click>

---

# Core Philosophy

<div class="text-3xl font-bold mb-8 text-center">
  <v-click>Not a framework.</v-click>
  <v-click>Not an npm package.</v-click>
  <v-click>Just Meta Effects.</v-click>
</div>

<v-click>

## Each component is:
- **50-100 lines** of focused TypeScript
- **Effect-first** - every operation is an Effect
- **Framework-aware** - integrates, doesn't replace
- **Self-contained** - copy-paste ready

</v-click>

---
layout: center
---

# How It Works

```bash
# Copy a component into your project
npx meta-effect add effect-vite/loader

# Or just copy from GitHub
curl https://raw.githubusercontent.com/.../effect-loader.ts > ./lib/effect-loader.ts
```

<v-click>

That's it. You now **own** the code.

</v-click>

---

# Component Showcase: Vite Loader

60 lines of Effect + Vite integration

```ts {all|1-3|5-10|12-18|all}
import { Effect } from "effect"
import type { HttpRouter } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"

export const createEffectLoader = (
  router: HttpRouter.HttpRouter,
  layer: Layer.Layer<never>
) => {
  return async (req: Request) => {
    const response = await router.handle(req)
      .pipe(Effect.provide(layer), Effect.runPromise)

    return response
  }
}

// Copy this file into your project and customize for your needs.
```

<v-click>

**What you get**: Type-safe routing, automatic Layer provision, Effect.gen support

</v-click>

---

# Component Showcase: Remix Actions

60 lines to run Effect programs in Remix

```ts {all|1-5|7-15|17-22|all}
import { Effect, Layer } from "effect"
import type { ActionFunctionArgs } from "@remix-run/node"

export const withEffect = <E, A>(
  effectFn: (args: ActionFunctionArgs) => Effect.Effect<A, E>,
  layer: Layer.Layer<never>
) => {
  return async (args: ActionFunctionArgs) => {
    return await effectFn(args)
      .pipe(
        Effect.provide(layer),
        Effect.runPromise
      )
  }
}

export const loader = withEffect(
  ({ request }) => Effect.gen(function*() {
    const data = yield* DataService
    return json({ data })
  }),
  AppLayer
)
```

---

# Component Showcase: CI/CD DAG Runner

80 lines for Effect-based CI workflows

```ts {all|1-5|7-12|14-20|all}
import { Effect, Schedule } from "effect"
import type { Step, DAG } from "./types"

// Validate DAG has no cycles
export const validateDAG = (dag: DAG) => Effect.gen(function*() {
  // Topological sort to detect cycles
  yield* detectCycles(dag)
})

// Run steps in dependency order
export const runDAG = (dag: DAG) => Effect.gen(function*() {
  const sorted = yield* topologicalSort(dag)

  yield* Effect.forEach(sorted, (step) =>
    runStep(step).pipe(
      Effect.retry(Schedule.exponential("1 second")),
      Effect.timeout("5 minutes")
    ),
    { concurrency: 4 }
  )
})
```

<v-click>

**Real Effect patterns**: Error handling, retries, timeouts, concurrency

</v-click>

---
layout: two-cols
---

# Architecture

```
meta-effect/
└── packages/
    └── registry/
        ├── registry.json
        └── src/
            ├── effect-vite/
            ├── effect-remix/
            ├── effect-ci/
            ├── effect-livestore/
            └── effect-prisma/
```

::right::

<v-click>

## Registry Features

- **Auto-generated** from JSDoc
- **Dependency tracking**
- **Tag-based search**
- **Preset bundles**

</v-click>

<v-click>

```json
{
  "components": {
    "effect-vite/loader": {
      "files": ["loader.ts"],
      "dependencies": {
        "effect": "^3.0.0",
        "@effect/platform": "^0.60.0"
      }
    }
  }
}
```

</v-click>

---

# Effect Service Pattern

Components use Effect's service pattern for DI

```ts {all|1-3|5-12|14-18|all}
export class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    effect: Effect.gen(function*() {
      const prisma = new PrismaClient()

      return {
        query: (sql: string) => Effect.tryPromise(() =>
          prisma.$queryRaw(sql)
        ),
        close: () => Effect.sync(() => prisma.$disconnect())
      } as const
    })
  }
) {}

// Use in your application
const program = Effect.gen(function*() {
  const db = yield* DatabaseService
  const result = yield* db.query("SELECT * FROM users")
  return result
})
```

---
layout: center
class: text-center
---

# Live Demo

Let's vendor a component and customize it

<v-click>

## Copy → Customize → Compose

</v-click>

---

# Demo: Adding Effect to Vite

Step 1: Copy the loader

```bash
curl https://raw.githubusercontent.com/meta-effect/registry/main/effect-vite/loader.ts \
  > ./src/lib/effect-loader.ts
```

<v-click>

Step 2: Install dependencies

```bash
pnpm add effect @effect/platform @effect/platform-node
```

</v-click>

<v-click>

Step 3: Customize for your needs

```ts
// src/lib/effect-loader.ts - Edit line 45
export const createEffectLoader = (router, layer) => {
  // Add your custom logging
  console.log("Starting Effect loader...")
  // ... rest of implementation
}
```

</v-click>

---

# Why 50-100 Lines Matters

<v-clicks>

## Readability
You can understand the entire component in one sitting

## Ownership
Small enough to confidently modify without fear

## Educational
Learn Effect patterns by reading real implementations

## Composable
Mix and match components without bloat

</v-clicks>

---
layout: two-cols
---

# Comparison: npm Package

```ts
// Install framework
npm install effect-framework

// Use abstraction
import { createApp } from 'effect-framework'

const app = createApp({
  // Magic happens here
  // How does it work? 🤷
})
```

<v-click>

❌ Hidden implementation
❌ Version lock-in
❌ Breaking changes
❌ Framework opinions

</v-click>

::right::

<v-click>

# Comparison: Meta Effect

```ts
// Copy component (60 lines)
// ./lib/effect-loader.ts

import { Effect } from "effect"

export const createEffectLoader =
  (router, layer) => {
    // You can see exactly
    // what it does!
  }
```

✅ Transparent code
✅ No dependencies
✅ Your changes
✅ Your architecture

</v-click>

---

# Inspired by shadcn/ui

<div class="grid grid-cols-2 gap-4">

<div>

### shadcn/ui
- Copy UI components
- Customize styles
- Own the code
- No npm package

</div>

<div>

### Meta Effect
- Copy Effect components
- Customize logic
- Own the code
- No npm package

</div>

</div>

<v-click>

## The Pattern Works

shadcn/ui proved developers want **ownership** over **convenience**

</v-click>

---

# Current Component Library

<div class="grid grid-cols-2 gap-8">

<div>

### effect-vite
- HTTP routing
- Server integration
- Atom state management
- Request handlers

### effect-remix
- Loaders
- Actions
- Error boundaries
- Progressive enhancement

</div>

<div>

### effect-ci
- DAG validation
- Pipeline runner
- Step transforms
- Workflow composition

### effect-livestore
- Real-time sync
- WebSocket integration
- Conflict resolution

</div>

</div>

---

# Effect-First Principles

Every component teaches Effect patterns:

<v-clicks>

1. **Effect.gen** - Generator syntax for sequencing
2. **Services** - Dependency injection with Effect.Service
3. **Layers** - Composable dependency provision
4. **Schema** - Runtime validation with Effect Schema
5. **Error handling** - Typed errors with Effect.fail
6. **Retries** - Built-in retry policies
7. **Concurrency** - Effect.forEach with concurrency control

</v-clicks>

---

# Component Example: Form Validation

```ts {all|1-6|8-15|17-24|all}
import { Schema } from "@effect/schema"
import { Effect } from "effect"

// Define schema
const UserSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)),
  age: Schema.Number.pipe(Schema.between(0, 120))
})

// Validate with Effect
export const validateUser = (data: unknown) =>
  Schema.decode(UserSchema)(data).pipe(
    Effect.mapError(error => ({
      _tag: "ValidationError" as const,
      message: error.message
    }))
  )

// Use in your app
const program = Effect.gen(function*() {
  const user = yield* validateUser({ email: "test@example.com", age: 25 })
  yield* saveUser(user)
})
```

---
layout: center
class: text-center
---

# Why Now?

<v-clicks>

Effect 3.0 is **stable**

Web frameworks need **Effect integrations**

Developers want **ownership** of their code

The shadcn/ui pattern **proved successful**

</v-clicks>

---

# Roadmap

<v-clicks>

## Q1 2025
- ✅ Registry with 20+ components
- ✅ effect-vite, effect-remix, effect-ci
- 🚧 CLI for easy copying (`npx meta-effect add`)

## Q2 2025
- effect-solidjs components
- effect-nextjs components
- Interactive playground
- Video tutorials

## Q3 2025
- Community contributions
- Component marketplace
- Advanced patterns library

</v-clicks>

---

# How to Contribute

<v-clicks>

## 1. Add Components
Create minimal Effect integrations for your favorite frameworks

## 2. Improve Existing
PRs welcome for better patterns or bug fixes

## 3. Share Patterns
Document your Effect + framework learnings

## 4. Build Tools
Help with CLI, docs, or playground

</v-clicks>

<v-click>

All contributions must follow:
- **50-100 line** limit
- **JSDoc** with examples
- **Effect-first** design
- **"Copy this file"** footer

</v-click>

---
layout: two-cols
---

# Get Started Today

```bash
# Clone the registry
git clone github.com/effect-meta/meta-effect

# Browse components
cd meta-effect/packages/registry/src

# Copy what you need
cp effect-vite/loader.ts \
   ~/my-project/lib/

# Make it yours
code ~/my-project/lib/loader.ts
```

::right::

<v-click>

## Resources

- **GitHub**: github.com/effect-meta/meta-effect
- **Docs**: docs.meta-effect.dev
- **Registry**: registry.meta-effect.dev
- **Examples**: examples.meta-effect.dev

</v-click>

<v-click>

## Connect

- Effect Discord: #meta-effect
- Twitter: @meta_effect
- Issues: github.com/effect-meta/meta-effect/issues

</v-click>

---
layout: center
class: text-center
---

# Questions?

<div class="text-6xl mb-8">
🤔
</div>

Let's discuss Effect, vendorable components, and building better integrations

---
layout: end
class: text-center
---

# Thank You!

## Copy. Paste. Own.

<div class="pt-8 text-xl">
  Not a framework. Not an npm package. Just Meta Effects.
</div>

<div class="pt-12 text-sm opacity-75">
  github.com/effect-meta/meta-effect
</div>
