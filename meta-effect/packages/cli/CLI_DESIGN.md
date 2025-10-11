# Meta Effect CLI Design

The Meta Effect CLI enables vendoring components into user projects (like shadcn/ui).

## Core Commands

### `add` - Add Components

Copy components from the registry into the user's project.

```bash
# Add a single component
npx meta-effect add api-atom

# Add multiple components
npx meta-effect add api-atom route-atom

# Add a preset (bundle of related components)
npx meta-effect add vite-full

# Interactive mode
npx meta-effect add
```

**Behavior**:
1. Read `registry.json` from GitHub (or local if developing)
2. Resolve component files and dependencies
3. Prompt for destination directory (default: `src/lib/`)
4. Copy files to `{destination}/effect-vite/api-atom.ts`
5. Check for peer dependencies and warn if missing
6. Display success message with import example

**Options**:
- `--path <dir>` - Custom destination (default: `src/lib/`)
- `--overwrite` - Overwrite existing files
- `--dry-run` - Show what would be copied
- `--registry <url>` - Custom registry URL (for development)

### `list` - List Available Components

Show all components in the registry.

```bash
# List all components
npx meta-effect list

# List by type
npx meta-effect list --type effect-vite

# Show component details
npx meta-effect list api-atom
```

**Output**:
```
Meta Effect Components

effect-vite (~275 lines)
  http-api        Type-safe HttpApi definition (~65 lines)
  vite-plugin     Vite dev server integration (~60 lines)
  api-atom        Reactive atoms for APIs (~80 lines)
  route-atom      URL-synchronized atoms (~70 lines)

effect-remix (~245 lines)
  with-effect     Simple loader/action helpers (~60 lines)
  effect-loader   Advanced loader patterns (~90 lines)
  effect-action   Form actions with validation (~95 lines)

Presets:
  vite-full       Complete effect-vite setup
  remix-full      Complete effect-remix setup
```

### `init` - Initialize Project

Set up Meta Effect configuration for a project.

```bash
npx meta-effect init
```

**Behavior**:
1. Create `meta-effect.json` config file
2. Ask for preferred destination directory
3. Optionally add starter components

**Config File** (`meta-effect.json`):
```json
{
  "$schema": "https://meta-effect.dev/schema.json",
  "libDir": "src/lib",
  "registry": "https://raw.githubusercontent.com/meta-effect/meta-effect/main/registry"
}
```

### `diff` - Show Component Changes

See what changed in registry vs local copy.

```bash
# Show diff for a component
npx meta-effect diff api-atom

# Show all diffs
npx meta-effect diff
```

**Output**:
- Show git-style diff of local vs registry
- Highlight customizations user made
- Suggest updating if significant changes

### `update` - Update Components

Update local components from registry.

```bash
# Update a component
npx meta-effect update api-atom

# Update all components
npx meta-effect update --all
```

**Behavior**:
1. Show diff of changes
2. Prompt for confirmation
3. Create backup of current version
4. Copy new version from registry
5. Report what changed

**Important**: Warn user that customizations will be lost!

## Implementation Architecture

### Tech Stack

- **Effect CLI** - Command parsing and composition
- **Effect Platform** - File system operations
- **Effect Schema** - Registry validation
- **Effect HTTP** - Fetch registry from GitHub

### Project Structure

```
meta-effect/packages/cli/
├── src/
│   ├── commands/
│   │   ├── add.ts       # Add command implementation
│   │   ├── list.ts      # List command
│   │   ├── init.ts      # Init command
│   │   ├── diff.ts      # Diff command
│   │   └── update.ts    # Update command
│   ├── services/
│   │   ├── Registry.ts  # Fetch and parse registry
│   │   ├── FileSystem.ts # File operations
│   │   └── Prompt.ts    # User prompts
│   ├── schemas/
│   │   ├── Registry.ts  # Registry.json schema
│   │   └── Config.ts    # meta-effect.json schema
│   └── cli.ts           # Main CLI entry point
├── bin.ts               # npx entry point
└── package.json
```

### Core Services

#### RegistryService

```typescript
export class RegistryService extends Effect.Service<RegistryService>()("RegistryService", {
  effect: Effect.gen(function*() {
    // Fetch registry.json from GitHub or local
    const fetchRegistry = (url: string) =>
      Effect.gen(function*() {
        const response = yield* HttpClient.get(url)
        const json = yield* HttpBody.json(response.body)
        return yield* Schema.decode(RegistrySchema)(json)
      })

    // Resolve component files
    const resolveComponent = (name: string) =>
      Effect.gen(function*() {
        const registry = yield* fetchRegistry()
        const component = registry.components.find(c => c.name === name)
        if (!component) {
          return yield* Effect.fail(new ComponentNotFound({ name }))
        }
        return component
      })

    return { fetchRegistry, resolveComponent } as const
  })
}) {}
```

#### FileSystemService

```typescript
export class FileSystemService extends Effect.Service<FileSystemService>()("FileSystemService", {
  effect: Effect.gen(function*() {
    const fs = yield* NodeFileSystem.FileSystem

    // Copy component file to destination
    const copyComponent = (
      source: string,
      destination: string,
      overwrite: boolean
    ) =>
      Effect.gen(function*() {
        // Check if file exists
        const exists = yield* fs.exists(destination)
        if (exists && !overwrite) {
          return yield* Effect.fail(new FileExists({ path: destination }))
        }

        // Create directory if needed
        yield* fs.mkdir(Path.dirname(destination), { recursive: true })

        // Fetch source file
        const content = yield* HttpClient.get(source)
          .pipe(HttpBody.text)

        // Write to destination
        yield* fs.writeFileString(destination, content)

        return destination
      })

    return { copyComponent } as const
  })
}) {}
```

#### PromptService

```typescript
export class PromptService extends Effect.Service<PromptService>()("PromptService", {
  effect: Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal

    const confirm = (message: string) =>
      Effect.gen(function*() {
        yield* terminal.display(`${message} (y/n): `)
        const input = yield* terminal.readLine
        return input.toLowerCase() === 'y'
      })

    const select = <A>(message: string, choices: A[]) =>
      Effect.gen(function*() {
        yield* terminal.display(`\n${message}\n`)
        for (const [index, choice] of choices.entries()) {
          yield* terminal.display(`  ${index + 1}. ${choice}\n`)
        }
        yield* terminal.display('\nSelect: ')
        const input = yield* terminal.readLine
        const index = parseInt(input) - 1
        return choices[index]
      })

    return { confirm, select } as const
  })
}) {}
```

### Add Command Implementation

```typescript
export const AddCommand = Command.make("add", {
  name: "component",
  description: "Component name or preset to add"
}, {
  path: Options.directory("path").pipe(Options.withDefault("src/lib")),
  overwrite: Options.boolean("overwrite").pipe(Options.withDefault(false)),
  dryRun: Options.boolean("dry-run").pipe(Options.withDefault(false))
})

export const add = (args: typeof AddCommand.Type) =>
  Effect.gen(function*() {
    const registry = yield* RegistryService
    const fs = yield* FileSystemService
    const prompt = yield* PromptService

    // Resolve component or preset
    const component = yield* registry.resolveComponent(args.name)

    // Show what will be copied
    yield* Console.log(`\nAdding ${component.name}:\n`)
    for (const file of component.files) {
      const dest = `${args.path}/${file}`
      yield* Console.log(`  ${dest}`)
    }

    // Check dependencies
    if (component.dependencies.length > 0) {
      yield* Console.log(`\nDependencies:`)
      for (const dep of component.dependencies) {
        yield* Console.log(`  - ${dep}`)
      }
    }

    // Confirm
    const confirmed = yield* prompt.confirm("\nProceed?")
    if (!confirmed) {
      return yield* Console.log("Cancelled")
    }

    // Copy files
    for (const file of component.files) {
      const source = `https://raw.githubusercontent.com/meta-effect/meta-effect/main/registry/${file}`
      const dest = `${args.path}/${file}`

      if (!args.dryRun) {
        yield* fs.copyComponent(source, dest, args.overwrite)
      }
    }

    // Success message
    yield* Console.log(`\n✓ Added ${component.name}`)
    yield* Console.log(`\nImport with:`)
    yield* Console.log(`  import { ... } from '${args.path}/${component.files[0]}'`)
  })
```

## User Experience

### First Time User Flow

```bash
$ npx meta-effect add api-atom
```

Output:
```
Meta Effect - Vendorable Effect Components

Adding api-atom:
  src/lib/effect-vite/api-atom.ts (~80 lines)

Dependencies:
  - jotai
  - effect

Proceed? (y/n): y

✓ Added api-atom to src/lib/effect-vite/

Import with:
  import { apiAtom } from './lib/effect-vite/api-atom'

Note: This is YOUR code now. Modify it freely!
```

### Interactive Mode

```bash
$ npx meta-effect add
```

Output:
```
Meta Effect - Select Components

? What would you like to add?
  1. Single component
  2. Preset (bundle)
  3. Browse all

Select: 1

? Choose a component type:
  1. effect-vite (~275 lines total)
  2. effect-remix (~245 lines total)

Select: 1

? Choose component:
  1. http-api - Type-safe API definitions (~65 lines)
  2. vite-plugin - Dev server integration (~60 lines)
  3. api-atom - Reactive atoms for APIs (~80 lines)
  4. route-atom - URL-synchronized atoms (~70 lines)

Select: 3

Adding api-atom...
✓ Done!
```

## Testing Strategy

### Unit Tests

Test each service in isolation with Test layers:

```typescript
describe("RegistryService", () => {
  it("fetches and parses registry", () =>
    Effect.gen(function*() {
      const registry = yield* RegistryService.fetchRegistry()
      expect(registry.components.length).toBeGreaterThan(0)
    }).pipe(
      Effect.provide(TestRegistryLayer),
      Effect.runPromise
    )
  )
})
```

### Integration Tests

Test full command flows:

```typescript
describe("add command", () => {
  it("copies component to destination", () =>
    Effect.gen(function*() {
      const tmpDir = yield* createTempDir()

      yield* add({
        name: "api-atom",
        path: tmpDir,
        overwrite: false,
        dryRun: false
      })

      const exists = yield* fs.exists(`${tmpDir}/effect-vite/api-atom.ts`)
      expect(exists).toBe(true)
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
  )
})
```

## Future Enhancements

- **Interactive browser**: TUI for browsing components
- **Component search**: Fuzzy search by name/tag
- **Stats**: Show download counts, popularity
- **Templates**: Full project templates using components
- **Custom registries**: Support private component registries
