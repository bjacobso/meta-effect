# Architecture

This document describes the architecture and data flow of the domain-first starter.

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                        APPLICATIONS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐                    ┌─────────────────┐  │
│  │   apps/web    │                    │  apps/server    │  │
│  │  (Vite+React) │                    │  (Effect HTTP)  │  │
│  └───────┬───────┘                    └────────┬────────┘  │
│          │                                     │            │
└──────────┼─────────────────────────────────────┼────────────┘
           │                                     │
           ├─────────────┬───────────────────────┤
           │             │                       │
           ▼             ▼                       ▼
    ┌──────────┐  ┌──────────┐          ┌──────────┐
    │  routes  │  │  atoms   │          │   api    │
    │          │  │ (Jotai)  │          │ (HttpApi)│
    └────┬─────┘  └─────┬────┘          └─────┬────┘
         │              │                     │
         │              │        ┌────────────┤
         │              │        │            │
         └──────┬───────┴────────┴────┐       │
                │                     │       │
                ▼                     ▼       ▼
         ┌──────────┐          ┌──────────────┐
         │    ui    │          │    domain    │
         │(Pure Comp)│          │(Effect Schema)│
         └──────────┘          └──────────────┘
```

## Data Flow

### Request Flow (User Interaction → Server → Response)

```
User Interaction
      │
      ▼
React Component (ui package)
      │
      ├─ Reads state from Atom (atoms package)
      │       │
      │       ▼
      │  Atom executes Effect client (api package)
      │       │
      │       ▼
      │  HTTP Request via fetch
      │
      ├─ Or triggers navigation (routes package)
      │
      ▼
HTTP Server (apps/server)
      │
      ▼
API Handler (implements api contract)
      │
      ▼
Repository Interface (domain package)
      │
      ▼
Repository Implementation (in-memory/Prisma/etc)
      │
      ▼
Effect Schema Validation (domain package)
      │
      ▼
HTTP Response (validated against api contract)
      │
      ▼
Atom updates (atoms package)
      │
      ▼
Component Re-renders (ui package)
```

## Layer Responsibilities

### Domain Layer (`packages/domain`)
- **Purpose**: Define business models and repository interfaces
- **Dependencies**: None (only Effect Schema)
- **Exports**:
  - Effect Schema types (Employee, EmployeeId, Email)
  - Repository interfaces (EmployeeRepo)

### Routes Layer (`packages/routes`)
- **Purpose**: Framework-agnostic route definitions
- **Dependencies**: None
- **Exports**: Route objects with method + path

### API Layer (`packages/api`)
- **Purpose**: HTTP API contract using Effect HttpApi
- **Dependencies**: domain, routes
- **Exports**:
  - HttpApi definitions
  - Typed client factory (TODO: implement)

### Atoms Layer (`packages/atoms`)
- **Purpose**: Bridge between Effect clients and reactive UI
- **Dependencies**: api, domain
- **Exports**:
  - Jotai atoms for queries
  - Jotai atoms for mutations
  - React hooks

### UI Layer (`packages/ui`)
- **Purpose**: Pure presentational components
- **Dependencies**: domain only
- **Exports**: React components
- **Rules**:
  - Never fetch data
  - Never call APIs
  - Only receive props and call callbacks

### Testing Layer (`packages/testing`)
- **Purpose**: Mock implementations for testing
- **Dependencies**: domain, routes
- **Exports**: MSW handlers matching API contracts

### Server App (`apps/server`)
- **Purpose**: HTTP server runtime
- **Dependencies**: api, domain
- **Responsibilities**:
  - Mount API handlers
  - Provide repository implementations
  - Run Effect runtime

### Web App (`apps/web`)
- **Purpose**: Frontend application shell
- **Dependencies**: routes, atoms, ui
- **Responsibilities**:
  - Route configuration
  - Atom provider setup
  - Compose UI components with state

## Key Patterns

### 1. Effect Schema as Single Source of Truth

All data shapes are defined once in the domain layer:

```typescript
// packages/domain/src/employee.ts
export const Employee = S.Struct({
  id: EmployeeId,
  name: S.String,
  email: Email,
  role: S.Literal("engineer", "manager", "designer", "ops"),
  active: S.Boolean
})
```

This schema is used:
- By the API layer for request/response validation
- By the UI layer for TypeScript types
- By the server for runtime validation
- By tests for mock data generation

### 2. Pure Components

Components are pure functions that:
- Receive all data via props
- Never perform side effects
- Never call APIs directly
- Are easy to test in Storybook

```typescript
// packages/ui/src/employees/EmployeesList.tsx
export function EmployeesList({ employees, onSelect }: Props) {
  return <div>{/* render */}</div>
}
```

### 3. Atoms as State Layer

Atoms encapsulate:
- API calls wrapped in Effects
- Loading states
- Error handling
- Optimistic updates (future)

```typescript
// packages/atoms/src/employees.ts
export const employeesListAtom = atom(async () => {
  // Effect-based fetch
  return Runtime.runPromise(runtime)(
    client.list()
  )
})
```

### 4. Contract-First API Design

The API contract is defined once using Effect HttpApi:

```typescript
// packages/api/src/employee.api.ts
export class EmployeesApi extends HttpApiGroup.make("employees")
  .add(
    HttpApiEndpoint.get("list", "/employees")
      .addSuccess(S.Array(Employee))
  )
```

Both client and server implement this contract:
- **Server**: Mounts handlers that fulfill the contract
- **Client**: Generates typed fetch functions
- **Tests**: MSW handlers mirror the contract

### 5. Dependency Inversion

Repository interfaces are defined in the domain layer (high-level), but implemented in the server app (low-level). This allows:
- Easy testing with mock implementations
- Swapping persistence layers (in-memory → Prisma → etc.)
- Domain logic independent of infrastructure

## Storybook Integration

Storybook serves as a component workshop with two modes:

### Pure Props Mode (Fast Iteration)
```typescript
export const Basic: Story = {
  args: {
    employees: mockData
  }
}
```

### Contract Mode (MSW)
```typescript
// Configure MSW in Storybook preview
import { handlers } from "@acme/testing/msw"

// Stories automatically use contract-accurate mocks
```

## Future Enhancements

1. **Boundary Enforcement**: Use eslint-plugin-boundaries to enforce dependency rules
2. **Contract Tests**: Automated tests ensuring server matches API contracts
3. **Client Generation**: Auto-generate typed API clients from HttpApi definitions
4. **Optimistic Updates**: Atoms that update optimistically before server confirms
5. **Persistence**: Replace in-memory repo with Prisma or Drizzle
6. **Authentication**: Add auth flow as additional domain + API layer

## Benefits of This Architecture

1. **Type Safety**: End-to-end types from HTTP to UI
2. **Testability**: Each layer can be tested in isolation
3. **Flexibility**: Swap implementations without breaking contracts
4. **Developer Experience**: Storybook, hot reload, typed APIs
5. **Maintainability**: Clear boundaries and single source of truth
6. **Scalability**: Add features by extending layers independently
