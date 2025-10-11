# Meta Effect

> Not a framework. Not an npm package. Just Meta Effects.

## What is Meta Effect?

Meta Effect is a collection of **vendorable components** for building web applications with Effect-TS. Inspired by shadcn/ui, these aren't packages you install - they're **Meta Effects** you copy directly into your project and own.

Each component is a concise (~50-100 lines), focused primitive that shows how to compose Effect with Vite, Remix, HTMX, and other frameworks. Copy what you need, leave what you don't, and customize everything.

**Meta Effects** = Minimal, Effect-based primitives you vendor into your codebase.

## Installation

Add components to your project with the CLI:

```bash
# Add a single component
npx meta-effect add api-atom

# Add all Vite components
npx meta-effect add vite-full

# Add all Remix components
npx meta-effect add remix-full

# List available components
npx meta-effect list
```

Components are copied to `src/lib/` in your project. You own them. Modify freely.

## Available Components

### effect-vite (~275 lines total)

Build reactive Vite apps with Effect HttpApi:

- **http-api** - Type-safe API definitions (~65 lines)
- **vite-plugin** - Dev server integration (~60 lines)
- **api-atom** - Reactive atoms for APIs (~80 lines)
- **route-atom** - URL-synchronized atoms (~70 lines)

### effect-remix (~245 lines total)

Compose Effect services with Remix:

- **with-effect** - Simple loader/action helpers (~60 lines)
- **effect-loader** - Advanced loader patterns (~90 lines)
- **effect-action** - Form actions with validation (~95 lines)

### effect-htmx (planned)

Hypermedia-driven apps with Effect:

- **html-response** - HTML rendering utilities
- **htmx-attrs** - Type-safe HTMX attributes
- **sse-stream** - Server-sent events

## Why Vendorable?

Traditional npm packages create abstraction boundaries. You can't see inside them, and customizing behavior means fighting the abstraction.

With vendored components:

- ✅ **Full Visibility**: See exactly what's happening (~50 lines)
- ✅ **Zero Lock-in**: Update on your schedule
- ✅ **Easy Customization**: Modify the source directly
- ✅ **Educational**: Learn Effect patterns by reading
- ✅ **Framework Flexibility**: Adapt to your framework version

Like shadcn/ui, but for Effect.

## Philosophy

Meta Effect is an exploration of Effect from first principles. We're not building abstractions - we're discovering primitives.

Each component asks:
- How do Effect primitives naturally compose with this framework?
- What's the minimal code needed?
- Can this fit in ~50-100 lines?

The goal is discovery, not invention.

### Principles

- **Minimal** - Each component is ~50-100 lines
- **Vendorable** - Copy into your codebase, you own it
- **Composable** - Mix and match what you need
- **Educational** - Learn Effect patterns by reading
- **Framework-Aware** - Integrate with, don't replace

## Component Registry

All components live in [`registry/`](./registry/) with metadata in [`registry.json`](./registry/registry.json).

**Component Structure**:
```
registry/
├── effect-vite/
│   ├── http-api.ts        # ~65 lines
│   ├── vite-plugin.ts     # ~60 lines
│   ├── api-atom.ts        # ~80 lines
│   └── route-atom.ts      # ~70 lines
├── effect-remix/
│   ├── with-effect.ts     # ~60 lines
│   ├── effect-loader.ts   # ~90 lines
│   └── effect-action.ts   # ~95 lines
└── effect-htmx/           # Coming soon
```

See [registry/README.md](./registry/README.md) for details.

## Documentation

### Component Specifications

Each component type has a living specification that evolves with implementation:

- [**effect-vite Spec**](docs/specs/effect-vite.md) - Vite components and patterns
- [**effect-remix Spec**](docs/specs/effect-remix.md) - Remix components and patterns
- [**effect-htmx Spec**](docs/specs/effect-htmx.md) - HTMX components and patterns

### Design & Philosophy

- [**Framework Overview**](docs/core/overview.md) - Meta Effect architecture and philosophy
- [**Architecture Guide**](docs/core/architecture.md) - Technical deep-dive
- [**Remix Vision**](docs/core/remix-vision.md) - Effect + web fundamentals

### Historical RFCs

The original vision explored a meta-framework. We pivoted to vendorable components:

- [**Effect Meta RFC**](docs/rfcs/effect-meta-rfc.md) - Original meta-framework idea
- [**@effect/vite RFC**](docs/rfcs/effect-vite-rfc.md) - Vite integration exploration
- [**Original Vision**](docs/rfcs/original-rfc.md) - Where it all started

## Quick Examples

After adding components with `npx meta-effect add`, use them in your app:

### effect-vite

```typescript
// 1. Add components
// npx meta-effect add vite-full

// 2. Define your API (src/server/api.ts)
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

export class UserApi extends HttpApiGroup.make("users")
  .add(HttpApiEndpoint.get("list", "/users"))
{}

// 3. Use in Vite config
import { effectVite } from './lib/effect-vite/vite-plugin'

export default defineConfig({
  plugins: [effectVite({ api: UserApi, layer: AppLayer })]
})

// 4. Create reactive atoms (src/atoms/users.ts)
import { apiAtom } from './lib/effect-vite/api-atom'

export const usersAtom = apiAtom({
  query: () => fetch('/api/users').then(r => r.json()),
  key: 'users-list'
})

// 5. Use in component
import { useAtomValue } from 'jotai'

function UserList() {
  const users = useAtomValue(usersAtom)
  return <ul>{users.map(u => <li>{u.name}</li>)}</ul>
}
```

### effect-remix

```typescript
// 1. Add components
// npx meta-effect add remix-full

// 2. Use in route loader (app/routes/users.$id.tsx)
import { withEffect } from '~/lib/effect-remix/with-effect'
import { UserService } from '~/services'
import { AppLayer } from '~/server/layer'

export const loader = withEffect(AppLayer, ({ params }) =>
  Effect.gen(function* () {
    const user = yield* UserService.findById(params.id)
    const posts = yield* PostService.findByAuthor(params.id)
    return { user, posts }
  })
)

// 3. Use in action
import { effectAction } from '~/lib/effect-remix/effect-action'

export const action = effectAction({
  layer: AppLayer,
  schema: CreateUserSchema,
  handler: ({ validated }) =>
    Effect.gen(function* () {
      const user = yield* UserService.create(validated)
      return redirect(`/users/${user.id}`)
    })
})
```

## Project Status

**Current**: Building the component registry and CLI

### Completed
- ✅ Component registry structure
- ✅ effect-vite components (7 components, ~275 lines)
- ✅ effect-remix components (3 components, ~245 lines)
- ✅ Registry metadata (registry.json)

### In Progress
- 🚧 CLI `add` command implementation
- 🚧 Component documentation improvements
- 🚧 Example applications

### Planned
- 📋 effect-htmx components
- 📋 Component testing utilities
- 📋 Interactive component browser
- 📋 Video tutorials showing customization

## Contributing

Found a useful pattern? Add it to the registry!

### Adding a Component

1. **Keep it Small**: ~50-100 lines maximum
2. **Document Usage**: Include a detailed header comment with examples
3. **List Dependencies**: Only peer dependencies (user installs them)
4. **Add to Registry**: Update `registry/registry.json` with metadata

Example component structure:

```typescript
/**
 * Component Name
 *
 * Brief description of what this component does and why it's useful.
 *
 * @example
 * ```ts
 * // Show a complete, working example
 * import { component } from './lib/effect-vite/component'
 *
 * // Usage example
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

// Implementation (~50-100 lines)
```

### Building New Component Types

Interested in effect-solidjs? effect-qwik? effect-fresh?

1. Create `registry/effect-framework/` directory
2. Build 3-5 core components (~50-100 lines each)
3. Add spec doc in `docs/specs/effect-framework.md`
4. Update `registry.json`

### Join the Discussion

- [Effect Discord #ideas channel](https://discord.gg/effect-ts)
- Share your customizations and patterns
- Ask questions about Effect integration

## License

MIT - Copy freely!

## Acknowledgments

Meta Effect builds on brilliant work from:

- **Effect-TS** - Composable, type-safe effects
- **shadcn/ui** - Vendorable component philosophy
- **Vite** - Blazing-fast dev server
- **Remix** - Web fundamentals done right
- **HTMX** - Hypermedia-driven simplicity
- **Jotai** - Primitive and flexible React state

## Inspiration

This project asks: "What if shadcn/ui's philosophy applied to Effect bindings?"

Instead of installing `@effect/remix`, you copy `with-effect.ts` (60 lines) into your codebase. You see exactly how Effect composes with Remix. You modify it for your needs. You own it.

That's a **Meta Effect**.

---

**Not a framework. Not an npm package. Just Meta Effects.**