# Domain-First Starter

A minimal, domain-driven monorepo starter using **Effect-TS** primitives. Inspired by the blueprint for building web applications where domain models (Effect Schema) are the spine, and everything else adapts to them.

## Philosophy

- **Domain First**: Effect Schema defines your data models
- **Strict Dependencies**: UI components never import from server; everything flows through typed contracts
- **One Contract, Two Adapters**: Effect HttpApi defines endpoints; server implements them, web consumes typed clients
- **State is Atoms**: UI state managed via Jotai atoms that wrap Effect-based API clients
- **Stories Before Screens**: Every component has Storybook stories with MSW mock layers

## Monorepo Structure

```
starter/
├── apps/
│   ├── web/                 # Vite + React frontend
│   └── server/              # Effect-based HTTP server
├── packages/
│   ├── domain/              # Effect Schema models & repository interfaces
│   ├── routes/              # Framework-agnostic route definitions
│   ├── api/                 # Effect HttpApi contracts
│   ├── atoms/               # Jotai atoms wrapping Effect clients
│   ├── ui/                  # Pure React components
│   └── testing/             # MSW handlers for contract testing
```

## Dependency Rules

```
ui → domain, atoms (never server)
atoms → api (client), domain
api ↔ domain, routes
server → api (server adapter), domain
web → routes, atoms, ui
```

These rules are enforced to maintain clean architecture boundaries.

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Installation

```bash
cd starter
pnpm install
```

### Development

Run all apps and packages in development mode:

```bash
pnpm dev
```

This starts:
- **Server** on http://localhost:3000
- **Web** on http://localhost:5173 (proxies `/api` to server)

### Individual Commands

```bash
# Build all packages
pnpm build

# Type-check all packages
pnpm check

# Run tests
pnpm test

# Lint
pnpm lint

# Fix linting issues
pnpm lint-fix

# Run Storybook (from packages/ui)
cd packages/ui
pnpm storybook
```

## Package Details

### `@acme/domain`

Effect Schema models and repository interfaces (ports).

**Example:**
```typescript
import { Employee, EmployeeId } from "@acme/domain/employee"
```

### `@acme/routes`

Framework-agnostic route definitions shared by frontend and backend.

**Example:**
```typescript
import { Routes } from "@acme/routes"

const listRoute = Routes.Employees.list()
// { method: "GET", path: "/employees" }
```

### `@acme/api`

Effect HttpApi contracts that define the HTTP API surface.

**Example:**
```typescript
import { EmployeesApi } from "@acme/api/employee"
```

### `@acme/atoms`

Jotai atoms that wrap Effect-based API clients for reactive state management.

**Example:**
```typescript
import { useAtomValue } from "@acme/atoms/react"
import { employeesListAtom } from "@acme/atoms/employees"

function MyComponent() {
  const employees = useAtomValue(employeesListAtom)
  return <div>{/* render employees */}</div>
}
```

### `@acme/ui`

Pure React components that depend only on domain types.

**Example:**
```typescript
import { EmployeesList } from "@acme/ui/employees/EmployeesList"

<EmployeesList employees={data} onSelect={handleSelect} />
```

### `@acme/testing`

MSW request handlers for contract-accurate testing in Storybook and tests.

**Example:**
```typescript
import { handlers } from "@acme/testing/msw"
```

### `@acme/web`

Vite + React application that composes routes, atoms, and UI components.

### `@acme/server`

Effect-based HTTP server that implements the API contracts with repository adapters.

## Development Workflow

### Adding a New Feature

1. **Model**: Define domain types in `packages/domain/`
2. **Contract**: Extend the API in `packages/api/`
3. **Server**: Implement handlers in `apps/server/`
4. **Atoms**: Add state management in `packages/atoms/`
5. **UI**: Build pure components in `packages/ui/`
6. **Stories**: Create Storybook stories with MSW mocks
7. **Screen**: Compose atoms + components in `apps/web/`

### Example: Adding a Phone Field

```typescript
// 1. packages/domain/src/employee.ts
export const Employee = S.Struct({
  // ... existing fields
  phone: S.optional(S.String),
})

// 2. packages/api/src/employee.api.ts
// No changes needed - schema automatically updates

// 3. apps/server/src/repos/inMemory.ts
// Update mock data to include phone

// 4. packages/ui/src/employees/EmployeeRow.tsx
// Add phone display to component

// 5. Regenerate types and test
pnpm build
```

## Technology Stack

- **Effect-TS**: Functional programming runtime
- **Effect Schema**: Type-safe data modeling
- **Effect HttpApi**: Contract-first HTTP APIs
- **Jotai**: Atomic state management
- **React**: UI components
- **Vite**: Build tool and dev server
- **Storybook**: Component development
- **MSW**: API mocking
- **Turbo**: Monorepo task orchestration
- **pnpm**: Package manager

## Testing Strategy

- **Domain**: Pure function tests with Effect validation
- **API**: Contract tests ensuring encode/decode correctness
- **Components**: Render tests with props
- **Integration**: Storybook stories with MSW
- **E2E**: Playwright (not included in starter)

## Next Steps

- [ ] Add Prisma or Drizzle for database persistence
- [ ] Implement authentication flow
- [ ] Add deployment configuration
- [ ] Set up CI/CD pipeline
- [ ] Add E2E tests with Playwright
- [ ] Configure dependency boundary enforcement with eslint-plugin-boundaries

## Architecture Principles

This starter follows these key principles:

1. **Domain models are immutable source of truth** - Effect Schema definitions drive everything
2. **Pure components** - UI never performs side effects or data fetching
3. **Effect-first** - All operations that can fail or have side effects use Effect
4. **Type safety end-to-end** - From HTTP requests to UI rendering
5. **Composition over configuration** - Small, focused packages that compose well

## References

- [Effect-TS Documentation](https://effect.website)
- [Effect Schema Guide](https://effect.website/docs/schema/introduction)
- [Jotai Documentation](https://jotai.org)
- [MSW Documentation](https://mswjs.io)

---

Built with Effect-TS and domain-driven design principles.
