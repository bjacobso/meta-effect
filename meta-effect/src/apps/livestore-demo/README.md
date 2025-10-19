# LiveStore + Effect Demo App

A minimal todo list application demonstrating how to integrate **LiveStore** (local-first event sourcing) with **Effect-TS** using vendorable Meta Effect components.

## What This Demonstrates

This demo shows the complete integration pattern:

1. **Event Sourcing** - All state changes are events (TodoCreated, TodoCompleted, etc.)
2. **Effect-First Architecture** - Business logic as composable Effect programs
3. **Reactive UI** - Jotai atoms automatically subscribe to LiveStore queries
4. **Type Safety** - End-to-end types from events → state → UI

## Architecture

```
┌─────────────────────────────────────────┐
│     TodoApp.tsx (React Component)       │
│  - Uses Jotai atoms                     │
│  - Runs Effect programs on user actions │
└─────────────┬───────────────────────────┘
              │
              ├─── atoms.ts ────────────────┐
              │    (Reactive Queries)       │
              │    - liveStoreAtom          │
              │                              │
              └─── store.ts ────────────────┤
                   (Effect Programs)         │
                   - createTodo              │
                   - toggleTodo              │
                   - deleteTodo              │
                                             │
              ┌──────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      Vendorable Components (lib/)       │
│  ┌─────────────────────────────────┐   │
│  │ livestore-service.ts            │   │
│  │ - Effect Service wrapper        │   │
│  │ - dispatch, query, subscribe    │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ event-helpers.ts                │   │
│  │ - Type-safe event dispatchers   │   │
│  │ - makeEventDispatcher()         │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ livestore-atom.ts               │   │
│  │ - Jotai atoms for queries       │   │
│  │ - Auto-subscribing reactivity   │   │
│  └─────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│        LiveStore (event store)          │
│  - SQLite materialization               │
│  - Event sync                           │
│  - Reactive queries                     │
└─────────────────────────────────────────┘
```

## File Structure

```
livestore-demo/
├── README.md           # This file
├── schema.ts           # Event & table definitions (LiveStore schema)
├── store.ts            # LiveStore setup & Effect programs
├── atoms.ts            # Reactive Jotai atoms
├── TodoApp.tsx         # React component
└── main.tsx            # App entry point
```

## Key Patterns

### 1. Event Sourcing with Effect Schema

All state changes are immutable events:

```typescript
// schema.ts
export const todoCreated = Events.synced({
  name: 'TodoCreated',
  schema: Schema.Struct({
    id: Schema.String,
    text: Schema.String,
    createdAt: Schema.Number,
  }),
})
```

### 2. Effect Programs for Business Logic

All mutations are Effect programs:

```typescript
// store.ts
export const createTodo = (text: string) =>
  Effect.gen(function* () {
    const id = crypto.randomUUID()
    const createdAt = Date.now()
    yield* dispatch.todoCreated({ id, text, createdAt })
    return id
  })
```

### 3. Reactive Atoms for Queries

UI subscribes to LiveStore queries via atoms:

```typescript
// atoms.ts
export const activeTodosAtom = liveStoreAtom<Todo[]>({
  query: (db) =>
    db
      .select()
      .from(todosTable)
      .where((row) => row.completed.equals(false))
      .all(),
  key: 'active-todos',
})
```

### 4. React Component Ties It Together

```typescript
// TodoApp.tsx
const activeTodos = useAtomValue(activeTodosAtom) // Auto-updates on events

const handleAddTodo = async (text: string) => {
  const program = createTodo(text)
  await Effect.runPromise(program.pipe(Effect.provide(LiveStoreLayer)))
}
```

## Data Flow

**User Action → Effect Program → Event → Materialization → Query Update → UI Re-render**

1. User clicks "Add Todo"
2. `createTodo()` Effect program runs
3. `TodoCreated` event dispatched to LiveStore
4. Materializer inserts row into SQLite `todos` table
5. LiveStore notifies query subscribers
6. Jotai atom updates
7. React component re-renders

## Vendorable Components Used

This demo uses three vendorable components from `meta-effect/packages/registry/src/effect-livestore/`:

### livestore-service.ts (~97 lines)
Effect Service wrapper providing:
- `dispatch(event)` - Dispatch events as Effects
- `query(queryFn)` - Query state as Effects
- `subscribe(queryFn)` - Subscribe to queries as Streams

### event-helpers.ts (~94 lines)
Type-safe event dispatchers:
- `makeEventDispatcher(events)` - Create typed dispatchers
- `batchEvents(effects)` - Batch multiple events

### livestore-atom.ts (~109 lines)
Reactive Jotai atoms:
- `liveStoreAtom(options)` - Create subscribing atoms
- `liveStoreAtomFamily(options)` - Parameterized atom families

## Running the Demo

```bash
# Install dependencies
bun install @livestore/livestore @livestore/react @livestore/adapter-web
bun install jotai effect react react-dom

# Run dev server (with Vite)
bun vite

# Open browser to http://localhost:5173
```

## Key Takeaways

1. **Vendorable = Copy-Paste-Able**: Each component is ~50-100 lines, self-contained
2. **Effect-First**: All operations are Effects, enabling composition
3. **Type-Safe**: End-to-end types from events → state → UI
4. **Reactive**: UI automatically updates when events mutate state
5. **Local-First**: All data stored in client-side SQLite, syncs automatically

## Next Steps

- Add more events (TodoTextUpdated, TodoReordered)
- Add server sync (LiveStore has built-in sync)
- Add optimistic updates with Effect retry logic
- Add error boundaries with Effect error handling
- Add undo/redo (replay events)

## Philosophy

This demo follows Meta Effect principles:

> Not a framework. Not an npm package. Just Meta Effects.

Each vendorable component (~50-100 lines) demonstrates **Effect primitives composed with LiveStore**. Copy the components you need, customize them for your app.
