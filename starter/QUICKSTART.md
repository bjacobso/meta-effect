# Quick Start Guide

Get up and running with the domain-first starter in under 5 minutes.

## Installation

```bash
cd starter
pnpm install
```

## Start Development

Run both server and web app:

```bash
pnpm dev
```

This starts:
- **Backend**: http://localhost:3000 (Effect HTTP server)
- **Frontend**: http://localhost:5173 (Vite dev server)

The frontend proxies `/api/*` requests to the backend automatically.

## View Components in Storybook

```bash
cd packages/ui
pnpm storybook
```

Browse components at http://localhost:6006

## Project Structure at a Glance

```
starter/
├── apps/
│   ├── web/          # React app (Vite)
│   └── server/       # HTTP API (Effect)
├── packages/
│   ├── domain/       # Business models (Effect Schema)
│   ├── routes/       # Shared route definitions
│   ├── api/          # HTTP contracts (Effect HttpApi)
│   ├── atoms/        # State management (Jotai + Effect)
│   ├── ui/           # Pure React components + Storybook
│   └── testing/      # MSW mock handlers
```

## Make Your First Change

Let's add a department field to employees:

### 1. Update Domain Model

Edit `packages/domain/src/employee.ts`:

```typescript
export const Employee = S.Struct({
  id: EmployeeId,
  name: S.String,
  email: Email,
  role: S.Literal("engineer", "manager", "designer", "ops"),
  active: S.Boolean,
  department: S.String,  // Add this line
})
```

### 2. Update Mock Data

Edit `apps/server/src/repos/inMemory.ts`:

```typescript
const initialEmployees: ReadonlyArray<Employee> = [
  {
    id: "e1" as EmployeeId,
    name: "Ada Lovelace",
    email: "ada@acme.com" as Email,
    role: "engineer",
    active: true,
    department: "Engineering",  // Add to each employee
  },
  // ... update other employees
]
```

### 3. Update UI Component

Edit `packages/ui/src/employees/EmployeeRow.tsx` to display department:

```typescript
<p className="text-gray-600 mt-1">{employee.email}</p>
<p className="text-gray-500 text-sm">{employee.department}</p>  // Add this
```

### 4. Update Storybook Stories

Edit `packages/ui/src/employees/EmployeesList.stories.tsx`:

```typescript
const mockEmployees: ReadonlyArray<Employee> = [
  {
    // ... existing fields
    department: "Engineering",  // Add to mock data
  },
]
```

### 5. See Changes

The dev server will hot-reload automatically. Open:
- http://localhost:5173 - See department in the web app
- http://localhost:6006 - See department in Storybook

## Common Commands

```bash
# Install dependencies
pnpm install

# Development mode (all apps)
pnpm dev

# Build all packages
pnpm build

# Type-check everything
pnpm check

# Run tests
pnpm test

# Lint code
pnpm lint

# Fix lint issues
pnpm lint-fix

# Clean build artifacts
pnpm clean
```

## Individual Package Commands

```bash
# Run server only
cd apps/server
pnpm dev

# Run web only
cd apps/web
pnpm dev

# Run Storybook
cd packages/ui
pnpm storybook

# Build server
cd apps/server
pnpm build

# Build web
cd apps/web
pnpm build
```

## Understanding the Flow

### 1. User Clicks Employee in List

```
User clicks → EmployeesList component
              ↓
              onSelect callback fired
              ↓
              Navigate to /employees/:id
              ↓
              EmployeeDetailPage loads
              ↓
              employeeByIdAtom fetches data
              ↓
              HTTP GET /api/employees/:id
              ↓
              Server handler in apps/server
              ↓
              InMemory repository
              ↓
              Response validated against Employee schema
              ↓
              Atom updates
              ↓
              EmployeeRow component renders
```

### 2. Component Development in Storybook

```
Write component in packages/ui
              ↓
Create .stories.tsx file
              ↓
Import mock data or use MSW handlers
              ↓
Run pnpm storybook
              ↓
Develop component in isolation
              ↓
Component ready for integration
```

## Next Steps

1. **Read ARCHITECTURE.md** - Understand the design principles
2. **Explore the domain layer** - See how Effect Schema works
3. **Try the UI in Storybook** - See components in isolation
4. **Add a new field** - Practice the workflow above
5. **Add a new API endpoint** - Extend the EmployeesApi
6. **Swap the repository** - Replace in-memory with Prisma

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is taken:

```bash
# Change server port in apps/server/src/main.ts
# Change web port in apps/web/vite.config.ts
```

### Type Errors After Installing

```bash
pnpm build  # Build all packages to generate types
```

### Storybook Won't Start

```bash
cd packages/ui
rm -rf node_modules
pnpm install
```

## Resources

- [Effect Documentation](https://effect.website)
- [Jotai Documentation](https://jotai.org)
- [Storybook Documentation](https://storybook.js.org)
- [MSW Documentation](https://mswjs.io)

---

Happy coding! 🚀
