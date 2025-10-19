# Cheffect Effect Patterns Analysis

> Comprehensive analysis of Effect-TS patterns from [tim-smart/cheffect](https://github.com/tim-smart/cheffect)
>
> **Project**: Local-first meal planner PWA built with Effect, React, Vite, and SQLite

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Domain Modeling with Schema](#domain-modeling-with-schema)
4. [Service Layer Patterns](#service-layer-patterns)
5. [State Management with Atoms](#state-management-with-atoms)
6. [LiveStore Pattern](#livestore-pattern)
7. [AI Integration](#ai-integration)
8. [Routing Integration](#routing-integration)
9. [Runtime Configuration](#runtime-configuration)
10. [Key Takeaways](#key-takeaways)

---

## Project Overview

**Cheffect** is a local-first meal planning application demonstrating production-ready Effect patterns:

- **Tech Stack**: React, Vite, TanStack Router, Tailwind CSS
- **Effect Packages**:
  - `effect` (core)
  - `@effect/schema` (validation)
  - `@effect/platform` & `@effect/platform-browser` (cross-platform)
  - `@effect/ai` & `@effect/ai-openai` (AI integration)
  - `@effect/rpc` (remote procedures)
  - `@effect/sql` (database)
  - `@effect-atom/atom-react` (reactive state)
  - `@livestore/*` (offline-first persistence)

**Key Features**:
- Recipe management with AI-powered extraction
- Grocery list generation and management
- Offline-first with SQLite in web workers
- PWA with service workers
- AI-powered beautification and extraction

---

## Architecture Patterns

### 1. Layer-Based Composition

```typescript
// src/main.tsx - Runtime initialization
const ConfigProviderLive = Layer.setConfigProvider(
  ConfigProvider.fromJson(import.meta.env)
)

const ConfigLogLevelLive = Layer.mergeAll(
  ConfigProviderLive,
  Logger.pretty
)

Atom.runtime.addGlobalLayer(ConfigLogLevelLive)
```

**Pattern**: Build runtime environment by composing layers
- Configuration providers
- Logging setup
- Service dependencies

### 2. Effect Service Pattern

```typescript
// src/services/AiHelpers.ts
export class AiHelpers extends Effect.Service<AiHelpers>()("AiHelpers", {
  dependencies: [OpenAiClientLayer],
  effect: Effect.gen(function* () {
    const model = yield* OpenAiLanguageModel.model("gpt-4o")

    const recipeFromUrl = (url: string) =>
      Effect.gen(function* () {
        // Implementation
      }).pipe(Effect.provide(model))

    return { recipeFromUrl, beautifyGroceries } as const
  })
}) {}
```

**Pattern**: Services as dependency-injected, scoped effects
- Declare dependencies explicitly
- Use generator functions for composition
- Return immutable service interface

### 3. Scoped Resource Management

```typescript
// src/Recipes/RecipeExtractionManager.ts
export class RecipeExtractionManager extends Effect.Service<RecipeExtractionManager>()(
  "RecipeExtractionManager",
  {
    scoped: Effect.gen(function* () {
      const scope = yield* Effect.scope
      const helpers = yield* AiHelpers

      return {
        extractRecipe: Effect.fn((url: string) =>
          Effect.gen(function* () {
            const extracted = yield* helpers.recipeFromUrl(url)
            yield* Effect.forkIn(scope)(
              Store.commit(Events.recipeExtracted(extracted))
            )
            return extracted
          }).pipe(withToast("Extracting recipe..."))
        )
      }
    })
  }
) {}
```

**Pattern**: Scoped services for resource lifecycle management
- Automatic cleanup with `Effect.scope`
- Fork long-running operations in scope
- Error handling with custom wrappers (`withToast`)

---

## Domain Modeling with Schema

### 1. Class-Based Schemas

```typescript
// src/domain/Recipe.ts
export class Ingredient extends Schema.Class<Ingredient>("Ingredient")({
  name: Schema.String.annotations({
    description: "The name of the ingredient."
  }),
  quantity: Schema.NullOr(Schema.Number),
  unit: Schema.NullOr(Unit)
}) {
  get quantityWithUnit() {
    return this.quantity
      ? `${this.quantity} ${this.unit ?? ""}`
      : undefined
  }
}

export class Recipe extends Schema.Class<Recipe>("Recipe")({
  id: Schema.String,
  title: Schema.String,
  ingredients: Schema.Array(IngredientsComponent),
  steps: Schema.Array(Step),
  totalTime: Schema.NullOr(Duration),
  rating: Schema.NullOr(Rating),
  servings: Schema.NullOr(Schema.Number),
  // ...
}) {
  static asRecipe = Schema.transform(
    ExtractedRecipe,
    Recipe,
    {
      strict: true,
      decode: (extracted) => ({ ...extracted }),
      encode: (recipe) => ({ ...recipe })
    }
  )
}
```

**Patterns**:
- ✅ `Schema.Class` for structured domain models
- ✅ Annotations for documentation and metadata
- ✅ Computed properties (getters)
- ✅ Type transformations between schemas
- ✅ Nullable types with `Schema.NullOr`
- ✅ Nested complex types (arrays, objects)

### 2. Model Integration (Persistence)

```typescript
// src/domain/GroceryItem.ts
export class GroceryItem extends Model.Class<GroceryItem>("GroceryItem")({
  id: Model.GeneratedByApp(Schema.String),
  name: Schema.String,
  quantity: Schema.NullOr(Schema.String),
  aisle: Schema.NullOr(GroceryAisle),
  completed: Schema.NumberFromBoolean,
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate
}) {
  static fromForm(form: typeof GroceryItemForm.Type) {
    return new GroceryItem({
      ...form,
      id: Uuid.make(),
      completed: false
    })
  }

  static fromIngredient(ingredient: Ingredient) {
    return new GroceryItem({
      id: Uuid.make(),
      name: ingredient.quantityWithUnit ?? ingredient.name,
      completed: false
    })
  }
}
```

**Patterns**:
- ✅ `Model.Class` for database-backed entities
- ✅ `Model.GeneratedByApp` for client-generated IDs
- ✅ `Model.DateTimeInsert` / `Model.DateTimeUpdate` for timestamps
- ✅ `Schema.NumberFromBoolean` for SQLite compatibility
- ✅ Static factory methods for creation

### 3. Schema Encoding Utilities

```typescript
// src/domain/GroceryItem.ts
export const GroceryItemList = Schema.Array(GroceryItem).pipe(
  Xml.encodeArray("item"),
  Schema.annotations({ identifier: "GroceryItemList" })
)

export const GroceryItemListCsv = Schema.transform(
  GroceryItemList,
  Schema.String,
  {
    strict: true,
    decode: () => { throw new Error("Not implemented") },
    encode: (items) => items.map(i =>
      `${i.name}${i.quantity ? ` - ${i.quantity}` : ""}`
    ).join("\n")
  }
)
```

**Patterns**:
- ✅ XML encoding for AI prompts
- ✅ CSV transformations for exports
- ✅ Custom transformations with encode/decode

---

## Service Layer Patterns

### 1. AI Service with Prompting

```typescript
// src/services/AiHelpers.ts
const recipeFromUrl = (url: string) =>
  Effect.gen(function* () {
    const model = yield* OpenAiLanguageModel.model("gpt-4o")

    return yield* model.generate(
      {
        system: `You are a helpful assistant that extracts recipe information...`,
        user: `Please extract the recipe from: ${url}`
      },
      {
        schema: ExtractedRecipe,
        temperature: 0.5
      }
    )
  }).pipe(Effect.provide(model))

const beautifyGroceries = (items: ReadonlyArray<GroceryItem>) =>
  Effect.gen(function* () {
    const itemsXml = yield* Schema.encode(GroceryItemList)(items)
    const model = yield* OpenAiLanguageModel.model("gpt-4o-mini", {
      structuredOutputs: true
    })

    return yield* model.generate(
      {
        system: `You help organize grocery lists...`,
        user: `<grocery-items>\n${itemsXml}\n</grocery-items>`
      },
      { schema: GroceryItemAiList }
    )
  }).pipe(Effect.provide(model))
```

**Patterns**:
- ✅ Yield-based async composition
- ✅ Schema-validated AI responses
- ✅ XML encoding for structured prompts
- ✅ Multiple model configurations
- ✅ Dependency provision with `Effect.provide`

### 2. CORS Proxy Service

```typescript
// src/services/CorsProxy.ts
export class CorsProxy extends Effect.Service<CorsProxy>()("CorsProxy", {
  effect: Effect.gen(function* () {
    const corsProxyUrl = yield* Config.string("VITE_CORS_PROXY_URL")

    const fetch = (url: string) =>
      HttpClient.fetch(`${corsProxyUrl}${url}`).pipe(
        Effect.flatMap((_) => _.text),
        Effect.scoped
      )

    return { fetch } as const
  })
}) {}
```

**Patterns**:
- ✅ Config-driven service initialization
- ✅ HttpClient integration
- ✅ Scoped resource management
- ✅ Functional method composition

---

## State Management with Atoms

### 1. Atom Runtime Setup

```typescript
// src/Recipes/atoms.ts
export const runtimeAtom = Atom.runtime(
  Layer.mergeAll(AiHelpers.Default, Store.runtime)
)
```

**Pattern**: Create atom runtime with merged service layers

### 2. Atom Families (Parameterized State)

```typescript
// src/Recipes/atoms.ts
export const recipeFormByIdAtom = Atom.family((id: string) =>
  Atom.make(
    Effect.gen(function* () {
      const recipe = yield* recipeByIdAtom(id)
      return yield* Schema.encode(RecipeForm)(recipe)
    })
  )
)
```

**Patterns**:
- ✅ `Atom.family` for dynamic, parameterized atoms
- ✅ Schema transformations within atoms
- ✅ Computed atoms derived from queries

### 3. Effect-Based Atom Actions

```typescript
// src/Recipes/atoms.ts
export const createRecipeAtom = Atom.make(
  Effect.fn(() =>
    Effect.gen(function* () {
      const id = Uuid.make()
      yield* Store.commit(
        Events.recipeCreated({
          id,
          title: "New Recipe",
          // ...
        })
      )
      return id
    })
  )
)
```

**Patterns**:
- ✅ `Effect.fn()` for reusable effect functions
- ✅ Event-driven state mutations
- ✅ Return values for navigation/feedback

### 4. AI-Powered Atoms

```typescript
// src/Groceries/atoms.ts
export const beautifyGroceriesAtom = Atom.make(
  Effect.gen(function* () {
    const items = yield* allGroceryItemsArrayAtom
    const helpers = yield* AiHelpers
    const beautified = yield* helpers.beautifyGroceries(items)

    // Process AI results
    for (const item of beautified.modifiedItems) {
      const existing = items.find(i => i.id === item.id)
      if (existing && /* changed */) {
        yield* Store.commit(Events.groceryItemUpdated({ ...item }))
      }
    }

    for (const id of beautified.removedItems) {
      yield* Store.commit(Events.groceryItemDeleted({ id }))
    }
  })
)
```

**Patterns**:
- ✅ Atoms that trigger AI processing
- ✅ Batch state updates from AI results
- ✅ Event-based state mutations
- ✅ Service integration in atoms

---

## LiveStore Pattern

### 1. Schema Definition

```typescript
// src/livestore/schema.ts
import { Events, makeSchema, State } from "@livestore/livestore"

const events = Events.synced({
  recipeCreated: Schema.TaggedStruct("RecipeCreated", Recipe.omit("createdAt", "updatedAt")),
  recipeUpdated: Schema.TaggedStruct("RecipeUpdated", Recipe),
  recipeDeleted: Schema.TaggedStruct("RecipeDeleted", { id: Schema.String }),

  groceryItemCreated: Schema.TaggedStruct("GroceryItemCreated", GroceryItem.omit("createdAt", "updatedAt")),
  groceryItemUpdated: Schema.TaggedStruct("GroceryItemUpdated", GroceryItem),
  groceryItemDeleted: Schema.TaggedStruct("GroceryItemDeleted", { id: Schema.String }),
  // ...
})

const state = {
  recipes: State.SQLite.table(Recipe, {
    columns: {
      totalTime: (duration) => duration?.toString() ?? null,
      // ...
    }
  }),
  groceryItems: State.SQLite.table(GroceryItem, {
    columns: {
      aisle: (a) => a ?? null,
      // ...
    }
  }),
  // ...
}

export const schema = makeSchema({ events, state })
```

**Patterns**:
- ✅ Event sourcing with `Events.synced`
- ✅ Schema-backed events
- ✅ SQLite table definitions
- ✅ Custom column transformations
- ✅ Type-safe event-to-state mapping

### 2. Persisted Store with Web Workers

```typescript
// src/livestore/atoms.ts
import { makePersistedAdapter } from "@livestore/adapter-web"
import { AtomLivestore } from "@livestore/atom"

export class Store extends AtomLivestore.Tag("Store")<typeof schema>() {}

Store.use(
  makePersistedAdapter(schema, {
    storeId: "default",
    storage: { type: "opfs" as const },
    worker: new Worker(
      new URL("./livestore.worker.ts", import.meta.url),
      { type: "module" }
    ),
    sharedWorker: new SharedWorker(
      new URL("./livestore.worker.ts", import.meta.url),
      { type: "module" }
    ),
    batchUpdatesFromReact: true
  })
)
```

**Patterns**:
- ✅ OPFS (Origin Private File System) for persistence
- ✅ Web Worker for background processing
- ✅ SharedWorker for cross-tab sync
- ✅ React batching optimization
- ✅ Type-safe store tag

### 3. Web Worker Implementation

```typescript
// src/livestore/livestore.worker.ts
import { makeWorker } from "@livestore/adapter-web/worker"
import { schema } from "./schema.js"

makeWorker({ schema })
```

**Pattern**: Minimal worker setup with schema

### 4. LiveStore Queries

```typescript
// src/livestore/queries.ts
import { queryDb } from "@livestore/livestore"

export const allRecipesAtom = Atom.family(
  ({ search, sortBy }: { search: string; sortBy: "createdAt" | "title" }) =>
    queryDb({
      query: sql`
        SELECT * FROM recipes
        WHERE title LIKE ${`%${search}%`}
        ORDER BY ${sortBy === "createdAt" ? sql`createdAt DESC` : sql`title ASC`}
      `,
      schema: Recipe.array
    })
)

export const recipeByIdAtom = Atom.family((id: string) =>
  queryDb({
    query: sql`SELECT * FROM recipes WHERE id = ?`,
    bindValues: [id],
    schema: Recipe.array
  }).pipe(
    Effect.map((recipes) => recipes[0]),
    Effect.filterOrFail(
      (recipe): recipe is Recipe => recipe != null,
      () => new RecipeNotFoundError({ id })
    )
  )
)

export const allGroceryItemsAtom = queryDb({
  query: sql`SELECT * FROM grocery_items ORDER BY completed ASC, aisle ASC`,
  schema: GroceryItem.array
}).pipe(
  Effect.map((items) => {
    const byAisle = new Map<GroceryAisle, GroceryItem[]>()
    // Group by aisle
    return byAisle
  })
)
```

**Patterns**:
- ✅ `queryDb` for type-safe SQL queries
- ✅ Template literals for dynamic SQL
- ✅ Bind values for parameterization
- ✅ Schema validation on results
- ✅ Post-processing with `Effect.map`
- ✅ Custom errors with `Effect.filterOrFail`

### 5. Commit Hook Usage

```typescript
// In React components
import { useCommit } from "./livestore/atoms"

function Component() {
  const commit = useCommit()

  const handleCreate = () => {
    commit(Events.recipeCreated({ /* ... */ }))
  }

  const handleUpdate = (recipe: Recipe) => {
    commit(Events.recipeUpdated(recipe))
  }

  const handleDelete = (id: string) => {
    commit(Events.groceryItemDeleted({ id }))
  }
}
```

**Pattern**: React hook for event commits

---

## AI Integration

### 1. OpenAI Layer Configuration

```typescript
// src/services/AiHelpers.ts
import { OpenAiClientLayer, OpenAiLanguageModel } from "@effect/ai-openai"

export class AiHelpers extends Effect.Service<AiHelpers>()("AiHelpers", {
  dependencies: [OpenAiClientLayer],
  effect: Effect.gen(function* () {
    // Access to OpenAI client provided by layer
  })
}) {}
```

**Pattern**: Declare OpenAI as service dependency

### 2. Schema-Validated Generation

```typescript
const model = yield* OpenAiLanguageModel.model("gpt-4o")

const result = yield* model.generate(
  {
    system: "You are a helpful assistant...",
    user: "Extract recipe from: " + url
  },
  {
    schema: ExtractedRecipe,  // Effect Schema
    temperature: 0.5
  }
)
```

**Patterns**:
- ✅ Schema as type contract
- ✅ Automatic validation
- ✅ Type-safe responses

### 3. Structured Outputs

```typescript
const model = yield* OpenAiLanguageModel.model("gpt-4o-mini", {
  structuredOutputs: true  // Force JSON mode
})
```

**Pattern**: Enable structured outputs for reliable parsing

---

## Routing Integration

### 1. TanStack Router with Effect

```typescript
// src/routes/groceries.tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/groceries")({
  component: GroceryList
})

function GroceryList() {
  const items = useAtomValue(allGroceryItemsAtom)
  const commit = useCommit()

  return (/* JSX */)
}
```

**Patterns**:
- ✅ File-based routing
- ✅ Atoms in route components
- ✅ Effect-based data loading

### 2. Dynamic Routes

```typescript
// src/routes/recipe/$id.tsx
export const Route = createFileRoute("/recipe/$id")({
  component: RecipeDetail
})

function RecipeDetail() {
  const { id } = Route.useParams()
  const recipe = useAtomValue(recipeByIdAtom(id))

  return (/* JSX */)
}
```

**Pattern**: Parameterized atoms with route params

### 3. Router State Atom

```typescript
// src/Router.ts
import { Atom } from "@effect-atom/atom-react"

export const router = createRouter({
  routeTree,
  defaultPreload: "render",
  defaultPreloadDelay: 100
})

export const locationAtom = Atom.make(router.state.location)

router.subscribe("onRendered", () => {
  locationAtom.set(router.state.location)
})
```

**Pattern**: Sync router state to atoms

---

## Runtime Configuration

### 1. Config Provider from Environment

```typescript
// src/main.tsx
import { ConfigProvider, Layer } from "effect"

const ConfigProviderLive = Layer.setConfigProvider(
  ConfigProvider.fromJson(import.meta.env)
)
```

**Pattern**: Load config from Vite environment

### 2. Logger Configuration

```typescript
const ConfigLogLevelLive = Layer.mergeAll(
  ConfigProviderLive,
  Logger.pretty
)
```

**Pattern**: Combine config with logging layer

### 3. Global Layer Setup

```typescript
Atom.runtime.addGlobalLayer(ConfigLogLevelLive)
```

**Pattern**: Set global runtime for all atoms

### 4. Service-Specific Runtimes

```typescript
// src/Recipes/atoms.ts
export const runtimeAtom = Atom.runtime(
  Layer.mergeAll(AiHelpers.Default, Store.runtime)
)
```

**Pattern**: Create specialized runtimes for atoms

---

## Key Takeaways

### Architectural Patterns

1. **Effect Services for Business Logic**
   - Clear dependency declaration
   - Scoped resource management
   - Composable operations

2. **Schema-First Domain Modeling**
   - `Schema.Class` for DTOs
   - `Model.Class` for persistence
   - Transformations between representations

3. **Atom-Based Reactive State**
   - Effect programs as atom values
   - Atom families for parameterized state
   - Integration with React hooks

4. **LiveStore for Offline-First**
   - Event sourcing pattern
   - SQLite in web workers
   - Type-safe queries and mutations

5. **Layer Composition for Runtime**
   - Config providers
   - Service dependencies
   - Global and scoped runtimes

### Notable Techniques

✅ **Generator Functions Everywhere**: `Effect.gen` for async composition
✅ **Schema Annotations**: Documentation and metadata on types
✅ **Custom Errors**: Type-safe error handling with classes
✅ **Scope Management**: Automatic cleanup with `Effect.scope`
✅ **Fork for Concurrency**: `Effect.forkIn(scope)` for background work
✅ **XML Encoding**: Structured prompts for AI
✅ **Computed Properties**: Getters on Schema classes
✅ **Static Factory Methods**: Convenient constructors on models
✅ **Effect.fn**: Reusable effect functions
✅ **flow()**: Composition pipelines

### Integration Points

- **Vite**: Path aliases, PWA config, worker handling
- **React**: Atom hooks, routing, components
- **TanStack Router**: File-based routing with atoms
- **Tailwind**: Styling (orthogonal to Effect)
- **Service Workers**: PWA capabilities
- **Web Workers**: Background persistence
- **OpenAI**: AI services with schema validation

### Code Organization

```
src/
├── domain/          # Schema-based models (Recipe, GroceryItem)
├── services/        # Effect services (AiHelpers, CorsProxy)
├── livestore/       # Event store (schema, queries, atoms, worker)
├── routes/          # TanStack Router routes (with atoms)
├── Recipes/         # Feature atoms and components
├── Groceries/       # Feature atoms and components
├── components/ui/   # Shadcn-style components
└── lib/             # Utilities
```

### Vendorable Patterns for Meta Effect

From cheffect, these patterns are **highly vendorable**:

1. **Effect Service Template** (~30 lines)
   ```typescript
   export class MyService extends Effect.Service<MyService>()("MyService", {
     dependencies: [/* ... */],
     effect: Effect.gen(function* () {
       // Setup
       return { method1, method2 } as const
     })
   }) {}
   ```

2. **Schema Model Template** (~40 lines)
   ```typescript
   export class MyModel extends Model.Class<MyModel>("MyModel")({
     id: Model.GeneratedByApp(Schema.String),
     // fields
   }) {
     static fromForm(form) { /* ... */ }
   }
   ```

3. **LiveStore Setup** (~50 lines)
   - Event definitions
   - State tables
   - Schema composition
   - Worker integration

4. **Atom Runtime** (~20 lines)
   - Layer merging
   - Runtime creation
   - Hook exports

5. **AI Service Pattern** (~60 lines)
   - Model configuration
   - Schema-validated generation
   - Prompt construction

---

## Meta Effect Integration Ideas

### New Components to Consider

1. **`effect-livestore-setup`** (~80 lines)
   - Event schema template
   - SQLite table config
   - Worker setup
   - Commit hooks

2. **`effect-ai-service`** (~70 lines)
   - OpenAI service wrapper
   - Schema-validated generation
   - Streaming support
   - Error handling

3. **`effect-atom-runtime`** (~40 lines)
   - Runtime composition
   - Global layer setup
   - Atom families helper

4. **`effect-router-atoms`** (~50 lines)
   - Router state sync
   - Route param atoms
   - Navigation effects

5. **`effect-domain-model`** (~60 lines)
   - Schema.Class template
   - Model.Class template
   - Factory methods
   - Transformations

### Architecture Learnings

- **Use Atoms for React State**: Better than hooks for Effect programs
- **Services for Cross-Cutting Concerns**: AI, HTTP, Config
- **LiveStore for Persistence**: Event sourcing + SQLite
- **Layers for Composition**: Runtime configuration at app boundaries
- **Schema for Everything**: Validation, transformation, documentation

---

**Generated**: 2025-10-18
**Source**: https://github.com/tim-smart/cheffect
**Author**: Tim Smart (@tim-smart)
**Analysis**: Claude Code (Sonnet 4.5)
