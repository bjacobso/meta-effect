# Meta Effect Registry Demo

Interactive browser for exploring Meta Effect's vendorable components with an information-dense table interface.

## Overview

This React + Vite app provides a modern, accessible interface for browsing all components in the Meta Effect registry. It demonstrates how to:

- Load and parse the registry.json metadata using Effect
- Display components in an information-dense, sortable table
- Provide powerful search and filtering capabilities
- Show component source code with syntax highlighting in accessible dialogs
- Integrate shadcn/ui components with Effect patterns

## Features

- **Information-Dense Table**: View 10-15+ components at once with all metadata visible
- **Search & Filter**: Real-time search across names, descriptions, and tags; filter by component type
- **Sortable Columns**: Click column headers to sort by name, type, or file count
- **Source Code Viewer**: Click any row to view full source code with syntax highlighting and copy button
- **shadcn/ui Components**: Modern, accessible UI components (Table, Dialog, Badge, Input)
- **Effect-Powered**: Type-safe async operations with Effect
- **Responsive Design**: Mobile-friendly table layout with Tailwind CSS
- **Dark Theme**: Beautiful dark mode with gradient accents

## Running Locally

```bash
# Install dependencies
pnpm install

# Start dev server (automatically copies registry files)
pnpm dev

# Build for production
pnpm build
```

The app will be available at http://localhost:5173/

**Note**: The `dev` and `build` scripts automatically copy registry files from `../meta-effect/packages/registry/` into the `public/registry/` directory. This ensures the latest component data is always available.

## Architecture

### Registry Loader (`registry-loader.ts`)

Effect-based data loading (unchanged from vanilla version):

- `loadRegistry()` - Fetches and parses registry.json
- `loadComponentCode()` - Loads source code for a component
- `loadAllComponents()` - Loads all components with their code
- `groupComponentsByType()` - Groups components by framework type

### React Components

**`App.tsx`** - Main application container
- Loads components using Effect on mount
- Shows loading/error states
- Renders header with stats

**`RegistryTable.tsx`** - Information-dense table component
- Displays all components in sortable table format
- Real-time search across multiple fields
- Type filtering dropdown
- Click row to open code dialog
- Shows component count (filtered vs total)

**`CodeDialog.tsx`** - Accessible code viewer
- shadcn Dialog with Prism.js syntax highlighting
- Copy-to-clipboard button
- Displays metadata (files, dependencies, tags)
- Keyboard accessible (Esc to close)

### shadcn/ui Components (`src/components/ui/`)

Pre-built accessible components:
- `table.tsx` - Sortable table with hover states
- `dialog.tsx` - Accessible modal dialogs
- `badge.tsx` - Colored badges for types/tags
- `input.tsx` - Search input with focus states
- `button.tsx` - Copy button with icons

### Styling

**Tailwind CSS** with dark theme:
- Custom color variables for dark mode
- Responsive table layout
- Type-specific badge colors (blue for vite, purple for remix, etc.)
- Gradient header text

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Effect** - Functional effect system for async operations
- **shadcn/ui** - Accessible component library built on Radix UI
- **Tailwind CSS** - Utility-first CSS framework
- **Prism.js** - Syntax highlighting for TypeScript code
- **Lucide React** - Beautiful icon library

## Project Structure

```
demo-app/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn components (table, dialog, badge, etc.)
│   │   ├── App.tsx          # Main React app
│   │   ├── RegistryTable.tsx # Table with search/filter/sort
│   │   └── CodeDialog.tsx   # Code viewer modal
│   ├── lib/
│   │   └── utils.ts         # cn() helper for className merging
│   ├── main.tsx             # React entry point
│   ├── registry-loader.ts   # Effect-based registry loading
│   ├── registry-types.ts    # TypeScript types for registry
│   └── index.css            # Tailwind + theme variables
├── components.json          # shadcn/ui configuration
├── tailwind.config.ts       # Tailwind configuration
├── vite.config.ts           # Vite with React plugin
└── package.json             # Dependencies
```

## Key Improvements Over Previous Version

**Information Density**
- **Before**: Card layout showing 3-4 components at once
- **After**: Table showing 10-15+ components at once

**Discoverability**
- **Before**: Visual scanning only, limited grouping
- **After**: Search, filter, sort across all metadata

**Accessibility**
- **Before**: Custom modal with basic keyboard support
- **After**: shadcn Dialog with full ARIA compliance and keyboard navigation

**User Experience**
- Real-time search highlighting
- One-click sorting
- Type filtering
- Copy-to-clipboard
- Responsive mobile layout

## Extending This Demo

Future enhancements could include:

- **Keyboard shortcuts**: Arrow keys for navigation, `/` for search
- **Saved filters**: Persist filter/sort preferences
- **Multi-file components**: Tabs for components with multiple files
- **Installation command**: One-click copy of `npx meta-effect add component-name`
- **Dependency graph**: Visual graph of component dependencies
- **Live previews**: Interactive demos of components in action
- **Version history**: Show component changes over time

The React + Effect architecture makes all these features straightforward to implement while maintaining type safety and testability.
