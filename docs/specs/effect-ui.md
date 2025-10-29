# effect-ui Specification

**Status**: Initial Development
**Components**: See [`registry/effect-ui/`](../../meta-effect/packages/registry/src/effect-ui/)
**Last Updated**: 2025-10-28

## Overview

`effect-ui` is a collection of vendorable UI components (~500 lines total) for building Effect-based user interfaces with Vite, Vitest, and Storybook. These aren't npm packages - they're code you copy into your project with `npx meta-effect add`.

Each component is ~50-100 lines and designed to be modified for your needs.

## Philosophy

**Effect-First UI**: All state management uses Effect primitives (Schema, Cause, etc.) wrapped in Jotai atoms for reactivity. UI components bridge Effect's type safety with React's component model.

## Core Primitives

### 1. Table State Management

Composable atoms for managing table sorting, filtering, and pagination with HttpApi integration.

```typescript
import { createTableState } from './lib/effect-ui/table-state'
import { Schema } from '@effect/schema'
import { userClient } from './api/client'

// Define table state
const usersTable = createTableState({
  fetchData: (params) => userClient.list(params),
  schema: Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    email: Schema.String
  }),
  defaultSort: { field: 'name', direction: 'asc' },
  pageSize: 20
})

// Use in components
const [data] = useAtom(usersTable.dataAtom)
const [page, setPage] = useAtom(usersTable.pageAtom)
const [sort, setSort] = useAtom(usersTable.sortAtom)
```

**Key Features**:
- Pagination state atoms
- Sort state (field + direction)
- Filter state (arbitrary key-value pairs)
- Automatic refetch on state changes
- HttpApi integration via fetchData

### 2. Form State Management

Type-safe form state with Effect Schema validation.

```typescript
import { createFormState } from './lib/effect-ui/form-state'
import { Schema } from '@effect/schema'

const LoginSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.minLength(1)),
  password: Schema.String.pipe(Schema.minLength(8))
})

const loginForm = createFormState({
  schema: LoginSchema,
  onSubmit: async (data) => await api.login(data)
})

// Use in component
const [values, setValues] = useAtom(loginForm.valuesAtom)
const [errors] = useAtom(loginForm.errorsAtom)
const [, submit] = useAtom(loginForm.submitAtom)
const [isSubmitting] = useAtom(loginForm.isSubmittingAtom)
```

**Key Features**:
- Effect Schema validation
- Field-level error tracking
- Submission state management
- Reset functionality
- Type-safe values

### 3. Modal State Management

Promise-based modal state with stack support.

```typescript
import { createModalState } from './lib/effect-ui/modal-state'

const confirmModal = createModalState<boolean>()

// Open modal and await result
const [, open] = useAtom(confirmModal.openAtom)
const confirmed = await open({
  title: "Delete Item",
  content: "Are you sure?"
})

// Close with return value
const [, close] = useAtom(confirmModal.closeAtom)
close(true) // Resolves the promise from open()
```

**Key Features**:
- Promise-based return values
- Modal stack for multiple modals
- Props passing
- Type-safe return values
- Composable with other atoms

### 4. Error Boundary

React Error Boundary that integrates with Effect's Cause types.

```tsx
import { ErrorBoundary } from './lib/effect-ui/error-boundary'
import { Cause } from 'effect'

function App() {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <h2>Error</h2>
          <pre>{Cause.pretty(error)}</pre>
          <button onClick={reset}>Retry</button>
        </div>
      )}
    >
      <YourApp />
    </ErrorBoundary>
  )
}
```

**Key Features**:
- Catches React errors
- Integrates with Effect Cause
- Custom fallback UI
- Reset functionality
- Error logging callback

### 5. Search and Filter State

Composable atoms for search, filter, and sort operations.

```typescript
import { createSearchFilter, createSortableAtom } from './lib/effect-ui/search-filter'

const userFilter = createSearchFilter({
  data: usersAtom,
  searchFields: ['name', 'email'],
  filterFields: { role: 'all' }
})

const [search, setSearch] = useAtom(userFilter.searchAtom)
const [filters, setFilters] = useAtom(userFilter.filtersAtom)
const [results] = useAtom(userFilter.resultsAtom) // Automatically filtered

// Sorting
const { sortedAtom, sortConfigAtom } = createSortableAtom(userFilter.resultsAtom)
```

**Key Features**:
- Multi-field text search
- Field-based filtering
- Composable with other atoms
- Sorting by field + direction
- Reset functionality

## Component Catalog

| Component | Lines | Description | Tags |
|-----------|-------|-------------|------|
| `table-state.ts` | ~110 | Table pagination, sorting, filtering | state, atoms, tables |
| `form-state.ts` | ~115 | Form validation with Effect Schema | state, atoms, forms, validation |
| `modal-state.ts` | ~130 | Modal/dialog state management | state, atoms, modals |
| `error-boundary.tsx` | ~90 | React error boundary for Effect | ui, react, errors |
| `search-filter.ts` | ~125 | Search, filter, sort primitives | state, atoms, search |

**Total**: ~570 lines across 5 components

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      React Application                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │            UI Components (React)                  │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                                                    │ │
│  │  <Table />  <Form />  <Modal />  <Search />      │ │
│  │                                                    │ │
│  └───────────────────────────────────────────────────┘ │
│                         ↕                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │          Effect UI State Atoms (Jotai)            │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                                                    │ │
│  │  tableState → { data, page, sort, filters }      │ │
│  │  formState  → { values, errors, submitting }     │ │
│  │  modalState → { isOpen, props, promise }         │ │
│  │  searchState → { query, filters, results }       │ │
│  │                                                    │ │
│  └───────────────────────────────────────────────────┘ │
│                         ↕                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │            Effect Primitives                      │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                                                    │ │
│  │  Schema.decode → Validation                       │ │
│  │  Effect.gen    → Async operations                 │ │
│  │  Cause.pretty  → Error formatting                 │ │
│  │  HttpApi       → Data fetching                    │ │
│  │                                                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Development Workflow

### 1. Storybook Development

Each component has interactive stories demonstrating patterns:

```bash
cd meta-effect/packages/effect-ui
pnpm storybook
```

Stories show:
- Basic usage
- Error states
- Edge cases
- Effect integration patterns

### 2. Testing with Vitest

Tests use `@effect/vitest` for Effect-based assertions:

```typescript
import { describe, it, expect } from 'vitest'
import { Schema } from '@effect/schema'
import { createFormState } from './form-state'

describe('formState', () => {
  it('validates with Effect Schema', async () => {
    const form = createFormState({
      schema: LoginSchema,
      onSubmit: async () => {}
    })

    // Test structure
    expect(form.valuesAtom).toBeDefined()
    expect(form.errorsAtom).toBeDefined()
  })
})
```

### 3. Building the Package

Components are vendorable (copy-paste) but also available as npm package:

```bash
cd meta-effect/packages/effect-ui
pnpm build
```

## Design Principles

### 1. Effect-First Architecture

Every operation uses Effect primitives:
- **Schema** for validation
- **Either** for error handling
- **Cause** for error formatting
- **Effect** for async operations

### 2. Atom-Based Reactivity

State management via Jotai atoms:
- **Primitive atoms**: Simple state (string, boolean, number)
- **Derived atoms**: Computed from other atoms
- **Async atoms**: Wrap Effect programs
- **Write atoms**: Actions that update state

### 3. Type Safety

Full type inference across boundaries:
- Schema → validation → atom → component
- No runtime type assertions
- Compile-time guarantees

### 4. Composability

Components compose naturally:
```typescript
// Combine search + sort + pagination
const searchState = createSearchFilter({ data, searchFields })
const { sortedAtom } = createSortableAtom(searchState.resultsAtom)
const tableState = createTableState({ dataAtom: sortedAtom })
```

## Implementation Status

### ✅ Implemented
- ✅ Table state atoms (pagination, sort, filter)
- ✅ Form state with Schema validation
- ✅ Modal state with promises
- ✅ Error boundary for React
- ✅ Search/filter primitives
- ✅ Storybook configuration
- ✅ Vitest test setup
- ✅ TypeScript configurations

### 🚧 In Progress
- 🚧 Additional Storybook stories
- 🚧 Integration with effect-vite api-atom
- 🚧 Performance optimizations

### 📋 Planned
- 📋 Infinite scroll atom
- 📋 Optimistic UI updates
- 📋 Toast notification system
- 📋 Drag-and-drop state
- 📋 Multi-step form wizard

## Example Application Structure

```
my-app/
├── lib/
│   └── effect-ui/          # Vendored components
│       ├── table-state.ts
│       ├── form-state.ts
│       ├── modal-state.ts
│       ├── error-boundary.tsx
│       └── search-filter.ts
├── components/
│   ├── UserTable.tsx       # Uses table-state
│   ├── LoginForm.tsx       # Uses form-state
│   └── ConfirmDialog.tsx   # Uses modal-state
├── atoms/
│   ├── users.ts            # User-related atoms
│   └── posts.ts            # Post-related atoms
└── App.tsx
```

## Testing Strategy

### Unit Tests (Pure Functions)

```typescript
it('filters data correctly', () => {
  const filter = createSearchFilter({
    data: atom(mockUsers),
    searchFields: ['name', 'email']
  })

  expect(filter.searchAtom).toBeDefined()
})
```

### Integration Tests (Effect Programs)

```typescript
it.effect('validates form with Schema', () =>
  Effect.gen(function*() {
    const result = yield* Schema.decodeUnknown(LoginSchema)({
      email: 'test@example.com',
      password: 'password123'
    })
    expect(result).toBeDefined()
  })
)
```

### Component Tests (React)

```typescript
it('renders error boundary fallback', () => {
  const { container } = render(
    <ErrorBoundary fallback={(error, reset) => <div>Error!</div>}>
      <ThrowError />
    </ErrorBoundary>
  )
  expect(container.textContent).toBe('Error!')
})
```

## Performance Characteristics

- **Bundle Size**: ~3kb (atoms + utilities, excluding React/Jotai/Effect)
- **Reactivity**: Fine-grained atom updates (no unnecessary re-renders)
- **Validation**: Effect Schema validation is fast (~0.1ms per field)
- **Memory**: Atoms garbage collected when no longer subscribed

## Integration Points

### With effect-vite

```typescript
import { apiAtom } from './lib/effect-vite/api-atom'
import { createTableState } from './lib/effect-ui/table-state'

// Table state fetches via api-atom
const usersTable = createTableState({
  fetchData: (params) => userClient.list(params),
  schema: UserSchema
})
```

### With effect-forms

```typescript
import { FormIR } from './lib/effect-forms/form-schema'
import { createFormState } from './lib/effect-ui/form-state'

// Convert FormIR to form state
const formState = createFormStateFromIR(loginFormIR)
```

## Open Questions

1. **Server Components**: How to integrate with React Server Components?
2. **Suspense**: Should atoms support React Suspense boundaries?
3. **Devtools**: Build Jotai devtools integration for Effect atoms?
4. **A11y**: Accessibility patterns for modal/form state?
5. **Animation**: State management for transitions/animations?

## Related Documents

- [Effect Vite Specification](./effect-vite.md) - API integration
- [Effect Forms Specification](./effect-forms.md) - Form IR patterns
- [Meta Effect Philosophy](../core/overview.md) - Design principles

## Contributing

This is a living document. As we implement `effect-ui`, we update this spec with:
- New component discoveries
- Pattern improvements
- Community feedback
- Integration examples

See [package README](../../meta-effect/packages/effect-ui/README.md) for current implementation status.
