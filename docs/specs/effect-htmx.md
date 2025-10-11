# effect-htmx Specification

**Status**: Planned
**Components**: See [`registry/effect-htmx/`](../../registry/effect-htmx/) (coming soon)
**Last Updated**: 2025-10-10

## Overview

`effect-htmx` will be a collection of vendorable components for building hypermedia-driven applications with Effect's HttpApi. These will be code you copy into your project with `npx meta-effect add`, not npm packages.

Target: 3-5 components, ~200-300 lines total, each component ~50-100 lines.

## Core Primitives

### 1. HttpApi with HTML Responses

Effect HttpApi routes that return HTML fragments instead of JSON:

```typescript
// server/api.ts
import { HttpApi } from "@effect/platform"
import * as Schema from "@effect/schema/Schema"
import { Html } from "@effect/htmx"

// Schema for form input
const CreateTodoSchema = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String)
})

export class TodosApi extends HttpApi.Tag<TodosApi>()("TodosApi", {
  // GET /todos - Returns HTML list
  list: HttpApi.get("list", "/todos")
    .pipe(HttpApi.setResponse(Html.html)),

  // POST /todos - Returns HTML fragment
  create: HttpApi.post("create", "/todos")
    .pipe(HttpApi.setPayload(CreateTodoSchema))
    .pipe(HttpApi.setResponse(Html.html)),

  // DELETE /todos/:id - Returns empty or redirect
  delete: HttpApi.delete("delete", "/todos/:id")
    .pipe(HttpApi.setResponse(Html.html)),

  // PUT /todos/:id - Returns updated HTML
  update: HttpApi.put("update", "/todos/:id")
    .pipe(HttpApi.setPayload(CreateTodoSchema))
    .pipe(HttpApi.setResponse(Html.html))
}) {}
```

### 2. HTML Template Rendering with JSX

Use JSX for type-safe HTML templates:

```typescript
// server/components/TodoItem.tsx
import { Todo } from "~/types"

export function TodoItem({ todo }: { todo: Todo }) {
  return (
    <li
      id={`todo-${todo.id}`}
      class="todo-item"
      hx-target="this"
      hx-swap="outerHTML"
    >
      <span class="todo-title">{todo.title}</span>
      <button
        hx-delete={`/todos/${todo.id}`}
        hx-confirm="Are you sure?"
      >
        Delete
      </button>
      <button
        hx-get={`/todos/${todo.id}/edit`}
      >
        Edit
      </button>
    </li>
  )
}

export function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul id="todo-list" class="todos">
      {todos.map(todo => <TodoItem todo={todo} />)}
    </ul>
  )
}
```

### 3. Effect Services for HTML Responses

HttpApi handlers use Effect services and return rendered HTML:

```typescript
// server/handlers/todos.ts
import { Effect } from "effect"
import { TodoService } from "../services/TodoService"
import { Html } from "@effect/htmx"
import { TodoItem, TodoList } from "../components/Todos"

export const TodosApiLive = TodosApi.implement({
  list: () =>
    Effect.gen(function* () {
      const todos = yield* TodoService.list()

      return Html.render(<TodoList todos={todos} />)
    }),

  create: ({ payload }) =>
    Effect.gen(function* () {
      const todo = yield* TodoService.create(payload)

      // Return the new todo item to be appended to the list
      return Html.render(<TodoItem todo={todo} />)
    }),

  delete: ({ params }) =>
    Effect.gen(function* () {
      yield* TodoService.delete(params.id)

      // Return empty response (HTMX removes the element)
      return Html.empty()
    }),

  update: ({ params, payload }) =>
    Effect.gen(function* () {
      const todo = yield* TodoService.update(params.id, payload)

      // Return updated todo item
      return Html.render(<TodoItem todo={todo} />)
    })
})
```

### 4. HTMX Attributes as Type-Safe Helpers

Provide type-safe helpers for HTMX attributes:

```typescript
// @effect/htmx/attributes
import { ComponentProps } from "react"

export type HtmxAttributes = {
  "hx-get"?: string
  "hx-post"?: string
  "hx-put"?: string
  "hx-delete"?: string
  "hx-patch"?: string
  "hx-target"?: string
  "hx-swap"?: "innerHTML" | "outerHTML" | "beforebegin" | "afterbegin" | "beforeend" | "afterend" | "delete" | "none"
  "hx-trigger"?: string
  "hx-confirm"?: string
  "hx-indicator"?: string
  "hx-push-url"?: boolean | string
  "hx-select"?: string
  "hx-vals"?: string
}

// Helper for building HTMX-enhanced elements
export function htmx<T extends keyof JSX.IntrinsicElements>(
  tag: T,
  props: ComponentProps<T> & HtmxAttributes
) {
  return createElement(tag, props)
}
```

### 5. Form Validation and Error Responses

Schema validation with user-friendly error HTML:

```typescript
export const createTodo = HttpApi.post("create", "/todos")
  .pipe(HttpApi.setPayload(CreateTodoSchema))
  .pipe(HttpApi.setResponse(Html.html))

export const TodosApiLive = TodosApi.implement({
  create: ({ payload }) =>
    Effect.gen(function* () {
      // Validation happens automatically via Schema
      const todo = yield* TodoService.create(payload)

      return Html.render(<TodoItem todo={todo} />)
    }).pipe(
      // Catch validation errors and return error HTML
      Effect.catchTag("ParseError", (error) =>
        Effect.succeed(
          Html.render(
            <div class="error" role="alert">
              <p>{error.message}</p>
            </div>
          )
        )
      )
    )
})
```

### 6. Server-Side State with Effect Services

HTMX polls or long-polls Effect services for live updates:

```typescript
// Polling for updates
export class NotificationService extends Context.Tag("NotificationService")<
  NotificationService,
  {
    getUnread: (userId: string) => Effect.Effect<Notification[], NotificationError>
  }
>() {}

export const NotificationsApi = HttpApi.make({
  // Polled by HTMX every 5 seconds
  unread: HttpApi.get("unread", "/notifications/unread")
    .pipe(HttpApi.setResponse(Html.html))
})

export const NotificationsApiLive = NotificationsApi.implement({
  unread: () =>
    Effect.gen(function* () {
      const user = yield* AuthUser
      const notifications = yield* NotificationService.getUnread(user.id)

      return Html.render(
        <div
          id="notifications"
          hx-get="/notifications/unread"
          hx-trigger="every 5s"
          hx-swap="outerHTML"
        >
          {notifications.map(n => <NotificationBadge notification={n} />)}
        </div>
      )
    })
})
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  HTML + HTMX                         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  <button hx-post="/todos" hx-target="#todo-list">   │  │
│  │    Create Todo                                        │  │
│  │  </button>                                            │  │
│  │                                                       │  │
│  │  <ul id="todo-list">                                 │  │
│  │    <li hx-delete="/todos/1">Buy milk</li>           │  │
│  │  </ul>                                                │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓ HTMX Ajax                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Effect HttpApi Server                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              HttpApi Routes                          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  POST   /todos        → TodosApi.create()           │  │
│  │  GET    /todos        → TodosApi.list()             │  │
│  │  DELETE /todos/:id    → TodosApi.delete()           │  │
│  │  PUT    /todos/:id    → TodosApi.update()           │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Effect Services Layer                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  TodoService → Database                              │  │
│  │  AuthService → Session                               │  │
│  │  NotificationService → Cache                         │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              JSX Template Rendering                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  Html.render(<TodoItem todo={todo} />)              │  │
│  │                                                       │  │
│  │  Returns: <li id="todo-1">Buy milk</li>             │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              HTTP Response (HTML)                    │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Content-Type: text/html                             │  │
│  │  <li id="todo-1">Buy milk</li>                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Why HTMX?

- **Hypermedia-Driven**: HTML as the application state representation
- **Progressive Enhancement**: Works without client-side JavaScript
- **Reduced Complexity**: No client-side state management needed
- **Server Control**: All logic stays on server with Effect services

### 2. Why JSX for Templates?

- **Type Safety**: TypeScript checks props and children
- **Composition**: Components compose like React
- **Familiarity**: React developers feel at home
- **Server-Only**: No client bundle, just HTML output

### 3. HTML vs JSON

HTMX returns HTML fragments instead of JSON:

```typescript
// ❌ JSON Response (traditional API)
return { todo: { id: 1, title: "Buy milk" } }

// ✅ HTML Response (HTMX)
return Html.render(<TodoItem todo={todo} />)
// <li id="todo-1">Buy milk</li>
```

### 4. Effect Services for State

All application state lives in Effect services on the server:

- No client-side state management
- Services compose with Layer
- Type-safe business logic
- Testable with mock services

## Implementation Status

### ✅ Implemented
- None yet (package planned)

### 🚧 In Progress
- None yet

### 📋 Planned
- HttpApi HTML response type
- JSX template rendering utility
- HTMX attribute type definitions
- Form validation error rendering
- Server-sent events integration
- WebSocket support for live updates
- Development server with HMR

## Example Application Structure

```
my-htmx-app/
├── server/
│   ├── api/
│   │   ├── todos.ts         # TodosApi definition
│   │   └── notifications.ts # NotificationsApi
│   ├── components/
│   │   ├── TodoItem.tsx     # HTML templates
│   │   ├── TodoList.tsx
│   │   └── Layout.tsx
│   ├── services/
│   │   ├── TodoService.ts
│   │   └── NotificationService.ts
│   ├── handlers/
│   │   └── todos.ts         # TodosApiLive implementation
│   ├── layer.ts             # AppLayer composition
│   └── server.ts            # HTTP server
├── public/
│   ├── htmx.min.js          # HTMX library
│   └── styles.css
└── package.json
```

## Testing Strategy

### Handler Tests

```typescript
import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { TodosApiLive } from './handlers/todos'

describe('TodosApi', () => {
  it('creates a todo and returns HTML', () =>
    Effect.gen(function* () {
      const html = yield* TodosApiLive.create({
        payload: { title: "Buy milk" }
      })

      expect(html).toContain('<li')
      expect(html).toContain('Buy milk')
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
  )
})
```

### Component Tests

```typescript
describe('TodoItem component', () => {
  it('renders todo with delete button', () => {
    const todo = { id: "1", title: "Buy milk", completed: false }
    const html = Html.render(<TodoItem todo={todo} />)

    expect(html).toContain('Buy milk')
    expect(html).toContain('hx-delete="/todos/1"')
  })
})
```

## Performance Characteristics

- **Zero JavaScript**: App works without client-side JS
- **Minimal Bundle**: Only HTMX library (~14kb gzipped)
- **Server Rendering**: All HTML generated server-side
- **Partial Updates**: HTMX only updates changed fragments
- **Caching**: Effect Layer memoization for services

## Patterns

### Optimistic Updates

```typescript
// Button shows loading state while request is in flight
<button
  hx-post="/todos"
  hx-indicator="#spinner"
  hx-disabled-elt="this"
>
  Create Todo
  <span id="spinner" class="htmx-indicator">...</span>
</button>
```

### Polling for Updates

```typescript
// Poll for notifications every 10 seconds
<div
  hx-get="/notifications/unread"
  hx-trigger="every 10s"
  hx-swap="outerHTML"
>
  {notifications.map(n => <NotificationBadge notification={n} />)}
</div>
```

### Form Validation

```typescript
<form hx-post="/todos" hx-target="#todo-list" hx-swap="beforeend">
  <input name="title" required />
  <div id="errors"></div>
  <button>Create</button>
</form>

// Server returns error HTML on validation failure
Effect.catchTag("ParseError", (error) =>
  Effect.succeed(
    Html.render(
      <div id="errors" class="error">
        {error.message}
      </div>
    )
  )
)
```

### Infinite Scroll

```typescript
<div
  hx-get={`/todos?page=${page + 1}`}
  hx-trigger="revealed"
  hx-swap="afterend"
>
  Load More...
</div>
```

## Open Questions

1. **SSE vs Polling**: When to use Server-Sent Events vs polling?
2. **WebSockets**: How to integrate Effect Stream with WebSockets?
3. **Client State**: Any client state or purely server-driven?
4. **File Upload**: Best pattern for file uploads with HTMX?
5. **SEO**: How to ensure HTML responses are SEO-friendly?

## Related Documents

- [Effect Vite Spec](./effect-vite.md) - For comparison with SPA approach
- [Effect Remix Spec](./effect-remix.md) - For comparison with SSR approach
- [Framework Overview](../core/overview.md) - Meta Effect philosophy

## Contributing

This spec will evolve as we build the first implementation. We're exploring:
- JSX rendering strategies for server-side HTML
- HTMX patterns with Effect services
- Progressive enhancement techniques
- Testing strategies for hypermedia apps

See [package README](../../meta-effect/packages/effect-htmx/README.md) once implementation begins.
