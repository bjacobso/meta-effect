# Meta Effect Monorepo

This monorepo contains the implementation packages for Meta Effect - building Effect bindings from first principles.

## Packages

### [@meta-effect/effect-vite](./packages/effect-vite)

Effect bindings for Vite with HttpApi and Atom integration. Provides a unified primitive for building reactive Effect applications with Vite's dev server.

**Spec**: [docs/specs/effect-vite.md](../docs/specs/effect-vite.md)

### [@meta-effect/effect-remix](./packages/effect-remix)

Effect bindings for Remix with loader and action integration. Compose Effect services with Remix's web fundamentals.

**Spec**: [docs/specs/effect-remix.md](../docs/specs/effect-remix.md)

### [@meta-effect/registry](./packages/registry)

The vendorable components registry - the source of truth for all Meta Effect components. Contains effect-vite, effect-remix, effect-ci, and other vendorable primitives.

**Spec**: See [docs/specs/](../docs/specs/) for individual component specs.

### [@meta-effect/cli](./packages/cli)

CLI tools for Meta Effect projects. Scaffolding, development utilities, and project management.

## GitHub Actions

This repository includes automated workflows in `.github/workflows/`:

### Weekly Release Notes

Automatically generates release notes using the `effect-ci` components. See [.github/workflows/README.md](.github/workflows/README.md) for setup instructions.

**Prerequisites:**
- Add `ANTHROPIC_API_KEY` secret to repository settings
- Enable workflow permissions for creating releases

**To run manually:**
1. Go to Actions tab
2. Select "Weekly Release Notes" workflow
3. Click "Run workflow"

## Development

**Running Code**

This monorepo leverages [tsx](https://tsx.is) for executing TypeScript:

```sh
pnpm tsx ./path/to/the/file.ts
```

**Building**

To build all packages:

```sh
pnpm build
```

**Testing**

To test all packages:

```sh
pnpm test
```

## Project Structure

Each package follows first-principles design with living documentation in `../docs/specs/`. See the [main README](../README.md) for the full Meta Effect vision.

