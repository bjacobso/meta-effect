# Meta Effect Registry

This directory contains vendorable **Meta Effects** - primitives for composing Effect with web frameworks. These are not npm packages - they're designed to be copied directly into your project where you own and can customize them.

## Philosophy

Inspired by shadcn/ui, Meta Effect components are:

- **Copy-paste-able**: Add them to your project with a CLI command
- **Customizable**: You own the code, modify it however you need
- **Minimal**: Each component is ~50-100 lines of focused code
- **Composable**: Mix and match what you need

## Components

### effect-vite

Components for building Vite applications with Effect HttpApi:

| Component | Description | Lines |
|-----------|-------------|-------|
| `http-api` | Type-safe API definitions with Schema | ~65 |
| `vite-plugin` | Vite dev server integration | ~60 |
| `api-atom` | Reactive atoms for API calls | ~80 |
| `route-atom` | URL-synchronized atoms | ~70 |

**Total**: ~275 lines

### effect-remix

Components for Remix applications with Effect services:

| Component | Description | Lines |
|-----------|-------------|-------|
| `with-effect` | Simple loader/action helpers | ~60 |
| `effect-loader` | Advanced loader patterns | ~90 |
| `effect-action` | Form actions with validation | ~95 |

**Total**: ~245 lines

### effect-prisma

Components for Prisma ORM with Effect services:

| Component | Description | Lines |
|-----------|-------------|-------|
| `db-client` | Prisma Client wrapper with Effect | ~105 |
| `db-transaction` | Advanced transaction patterns | ~110 |

**Total**: ~215 lines

### effect-htmx

Components for HTMX with Effect backend (coming soon):

- `html-response` - HTML fragment rendering
- `htmx-attrs` - Type-safe HTMX attributes
- `sse-stream` - Server-sent events

## Usage

### Add a single component

```bash
npx meta-effect add api-atom
```

This copies `registry/effect-vite/api-atom.ts` to `src/lib/effect-vite/api-atom.ts` in your project.

### Add a preset

```bash
npx meta-effect add vite-full
```

This adds all effect-vite components at once.

### List available components

```bash
npx meta-effect list
```

## Registry Structure

```
registry/
├── registry.json          # Component metadata and dependencies
├── effect-vite/           # Vite-related components
│   ├── http-api.ts
│   ├── vite-plugin.ts
│   ├── api-atom.ts
│   └── route-atom.ts
├── effect-remix/          # Remix-related components
│   ├── with-effect.ts
│   ├── effect-loader.ts
│   └── effect-action.ts
├── effect-prisma/         # Prisma ORM components
│   ├── db-client.ts
│   └── db-transaction.ts
└── effect-htmx/           # HTMX-related components (planned)
    ├── html-response.ts
    └── htmx-attrs.ts
```

## Customization

After adding a component, it's **yours**. Common customizations:

### api-atom
- Add custom cache strategies
- Implement optimistic updates
- Add retry logic
- Custom error handling

### vite-plugin
- Add authentication middleware
- Custom error responses
- Request/response logging
- CORS handling

### effect-loader
- Add custom error mappings
- Request-scoped caching
- Performance monitoring
- Rate limiting

### db-client
- Add query caching
- Connection pool management
- Query logging
- Performance metrics
- Retry strategies

## Why Not npm Packages?

Traditional npm packages create abstraction boundaries. You can't see inside them without diving into node_modules, and customizing behavior often means fighting the abstraction.

With vendored components:

1. **Full Visibility**: See exactly what's happening
2. **Zero Lock-in**: Update on your schedule
3. **Easy Customization**: Change anything you want
4. **Educational**: Learn by reading ~50 lines
5. **Framework Flexibility**: Adapt to your framework version

## Contributing

Found a useful pattern? Add it to the registry!

1. Create a new component file (keep it under 100 lines)
2. Add metadata to `registry.json`
3. Document usage in the file header
4. Update this README

## Related

- [Main README](../README.md) - Meta Effect philosophy
- [Specs](../docs/specs/) - Detailed specifications
- [CLI](../meta-effect/packages/cli/) - CLI implementation
