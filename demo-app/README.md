# Meta Effect Registry Demo

Interactive browser for exploring Meta Effect's vendorable components.

## Overview

This Vite app provides a visual interface for browsing and exploring all components in the Meta Effect registry. It demonstrates how to:

- Load and parse the registry.json metadata
- Display components grouped by type (effect-vite, effect-remix, etc.)
- Show component source code with syntax highlighting
- Use Effect for async operations and error handling

## Features

- **Component Browser**: Browse all registry components organized by type
- **Component Details**: View descriptions, dependencies, tags, and file information
- **Source Code Viewer**: Click any component to view its full source code with syntax highlighting
- **Effect-Powered**: Built with Effect for type-safe async operations
- **Minimal Dependencies**: Vanilla TypeScript + Effect + Prism.js

## Running Locally

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

The app will be available at http://localhost:5173/

## Architecture

### Registry Loader (`registry-loader.ts`)

Uses Effect to load and parse the registry:

- `loadRegistry()` - Fetches and parses registry.json
- `loadComponentCode()` - Loads source code for a component
- `loadAllComponents()` - Loads all components with their code
- `groupComponentsByType()` - Groups components by framework type

### UI Components (`ui.ts`)

Vanilla TypeScript DOM manipulation:

- `createComponentCard()` - Renders a component card
- `createTypeSection()` - Renders a category of components
- `showComponentCode()` - Shows modal with syntax-highlighted code
- Loading and error states

### Styles (`style.css`)

Dark-themed UI with:

- Responsive grid layout
- Hover effects and animations
- Modal for code viewing
- Mobile-friendly design

## Tech Stack

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Effect** - Functional effect system for async operations
- **Prism.js** - Syntax highlighting for TypeScript code

## Project Structure

```
demo-app/
├── src/
│   ├── main.ts              # Entry point and main program
│   ├── registry-loader.ts   # Effect-based registry loading
│   ├── registry-types.ts    # TypeScript types for registry
│   ├── ui.ts                # UI component creation functions
│   └── style.css            # Dark theme styles
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies
```

## Building on This

This demo can be extended with:

- Search and filtering by tags/dependencies
- Interactive component demos
- Component installation instructions
- Dependency graph visualization
- Version history and changelogs

The minimal, Effect-first architecture makes it easy to add features while keeping code composable and testable.
