# Meta Effect Presentation Prompt

This is the source-of-truth prompt for generating `slides.md`. Use this to iterate the vision, vibes, and narrative arc before compiling to slides.

## Core Thesis

- Meta Effect is NOT a framework or npm package
- It's a collection of vendorable components (like shadcn/ui, but for Effect-TS)
- Copy. Paste. Own.
- Each component is 50-100 lines of focused, Effect-based code
- Users vendor components into their codebase and customize freely

## Dual Nature: Art Project + Science Experiment

- **Art Project**: Specs are design manifestos showing what Effect integrations could be
- **Science Experiment**: Exploring Effect patterns at scale through living specifications
- "None of them work... yet" - that's the point, not a bug
- Community-driven evolution through PRs (spec or implementation)

## Key Messages & Vibes

### The Problem (Traditional Frameworks)
- npm packages create version lock-in
- Frameworks dictate architecture
- Abstractions hide Effect primitives
- Updates require migrations
- You don't own the code

### The Meta Effect Way
- Vendor directly into your project
- Own the implementation completely
- Customize without forking
- Learn from minimal examples (50-100 lines)
- No version dependencies
- Framework-aware, not framework-replacing

### Spec-Driven Development Model
- Specs are living documents in `docs/specs/`
- Define desired DSL and API surface
- Specify compilation targets (GitHub Actions, Prisma, React, etc.)
- Provide comprehensive examples of what should exist
- Implementation follows specification
- Status: "Planned" = aspirational vision

### Component Philosophy
- **Effect-First**: Every operation is an Effect
- **Composable**: Components compose with each other
- **Framework-Aware**: Integrate, don't replace
- **Zero Magic**: Everything visible in ~50 lines
- **Educational**: Code teaches Effect patterns by example
- **Self-Contained**: Copy-paste ready

## Narrative Arc

### Act 1: The Hook
1. Opening: "What if Effect integrations worked like shadcn/ui?"
2. Problem: Traditional frameworks lock you in
3. Solution: Vendorable components give you control
4. Philosophy: "Not a framework. Not an npm package. Just Meta Effects."

### Act 2: Show, Don't Tell
5. How it works: `npx meta-effect add` or curl from GitHub
6. Component showcase: Vite Loader (60 lines)
7. Component showcase: Remix Actions (60 lines)
8. Component showcase: CI/CD DAG Runner (80 lines)
9. Architecture: Registry structure
10. Effect Service Pattern: DI with Effect.Service

### Act 3: Live Demo
11. Demo setup: Copy → Customize → Compose
12. Demo: Adding Effect to Vite (3 steps)

### Act 4: Why It Matters
13. Why 50-100 lines matters: Readability, Ownership, Educational, Composable
14. Comparison: npm package vs Meta Effect (side-by-side)
15. Inspiration: shadcn/ui proved the pattern works
16. Current library: effect-vite, effect-remix, effect-ci, effect-livestore
17. Effect-First Principles: Teaching Effect patterns

### Act 5: Deep Dive
18. Component example: Form validation with Effect Schema
19. Why now? Effect 3.0 stable, shadcn/ui success, ownership demand
20. Roadmap: Q1-Q3 2025

### Act 6: Community
21. How to contribute: Add components, improve existing, share patterns, build tools
22. Contribution guidelines: 50-100 lines, JSDoc, Effect-first, "Copy this file" footer
23. Get started today: Clone, browse, copy, customize
24. Resources: GitHub, docs, registry, examples

### Act 7: Q&A Bridge
25. Questions? (Discussion prompt)

### Act 8: The Reveal (Art + Science)
26. **"But Wait..."** - This is half art project, half science experiment
27. **Spec-Driven Development**: Specs ship alongside code
28. **Specs Define the Future**: Examples of effect-dag (workflows) and effect-entities (DDD)
29. **"None of Them Work... Yet"**: Aspirational by design
   - Art: Design manifestos
   - Science: Explore design space first
   - Community: Anyone can inch them closer
30. **Two Ways to Contribute**:
   - Path 1: Implement the spec (PR the component)
   - Path 2: Challenge the spec (PR the design)
   - No gatekeepers, just consensus
31. **AI Agent Era**: Why this model wins
   - Specs are self-documenting (JSON Schema, MCP, tool calling)
   - Vendorable = AI-modifiable (fits in context window)
   - Spec-driven = incremental implementation by agents
   - "The future of code isn't frameworks. It's living specifications."

### Act 9: Closing
32. Thank you! Copy. Paste. Own.

## Slide Design Principles

- Use v-click for progressive disclosure
- Keep code examples focused and readable
- Use two-cols layout for comparisons
- Center text for dramatic moments
- Include GitHub links and resources
- Emoji-free (professional tone)
- Monospace-friendly formatting

## Target Audience

- Effect-TS developers
- Web framework users (Vite, Remix, Next.js, SolidJS)
- Developers frustrated with framework lock-in
- Open source maintainers
- AI/LLM tooling builders

## Key Takeaways

1. Vendorable > npm packages for Effect integrations
2. 50-100 lines = readable, ownable, educational
3. Specs are living documents, not requirements
4. Anyone can contribute implementations or challenge designs
5. Perfect for AI agents: self-documenting, modifiable, incremental

## Compilation Notes

- Use Slidev as the presentation framework (already in slides.md front matter)
- Maintain existing slide syntax and layouts
- Preserve v-click animations for flow
- Keep code blocks syntax-highlighted with Shiki
- Use two-cols for side-by-side comparisons
- Use center layout for dramatic reveals
- End with layout: end for closing slide

## Meta

This prompt itself follows the Meta Effect philosophy:
- It's vendorable (copy into your project)
- It's focused (~200 lines of spec)
- It's the source-of-truth for compilation
- It's version-free (you own it)
- It's AI-friendly (structured, bulleted, clear)
