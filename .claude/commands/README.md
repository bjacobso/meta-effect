# Meta Effect Slash Commands

Claude Code commands for exploring and building vendorable Effect components.

## Philosophy: Discovery Through Exploration

Meta Effect isn't about building a framework - it's about discovering how Effect naturally composes with web frameworks. These commands support that exploratory, iterative process.

**The Journey**: Explore → Document → Refine → Implement

---

## Exploration Commands

### `/explore "idea"`
**Pure exploration** - Think through an idea without creating files.

Start here when you have a "what if?" question about Effect and a framework.

```bash
/explore "How would Effect compose with Astro's islands?"
```

**What it does:**
- Researches the framework/pattern's core primitives
- Identifies natural Effect integration points
- Thinks in ~50-100 line components
- Decides if worth pursuing further

**Output:** Insights and recommendations, no files created.

---

### `/new-rfc "topic"`
**Formalize exploration** - Create an RFC when an idea feels promising.

Turn exploratory thinking into a documented design proposal.

```bash
/new-rfc "Effect bindings for SolidJS"
```

**What it does:**
- Creates `docs/rfcs/{topic}-rfc.md`
- Documents the thought process and open questions
- Proposes 3-5 minimal components with examples
- Links to related RFCs and patterns

**Output:** RFC document capturing the exploration journey.

---

### `/edit-rfc "refinement"`
**Iterate on design** - Evolve an RFC based on new insights.

Keep the RFC alive as understanding deepens.

```bash
/edit-rfc "Split effect-remix into loader and action helpers"
```

**What it does:**
- Identifies relevant RFC in `docs/rfcs/`
- Updates design with new approach
- Maintains revision history
- Notes impact on existing components

**Output:** Updated RFC with documented evolution.

---

### `/apply-rfc <rfc-name>`
**Build the thing** - Transition from exploration to implementation.

When the design feels right, create actual vendorable components.

```bash
/apply-rfc effect-vite-rfc
```

**What it does:**
- Creates components in `registry/` based on RFC
- Updates `registry.json` with metadata
- Creates or updates `docs/specs/{type}.md`
- Links implementation back to RFC

**Output:** Working vendorable components (~50-100 lines each).

---

## Component Commands

### `/edit-component <name> "change"`
**Edit with context** - Modify a component with full ecosystem awareness.

Make changes while understanding the component's role and relationships.

```bash
/edit-component api-atom "add exponential backoff retry"
```

**What it does:**
- Loads: component file, registry entry, spec, related RFCs
- Loads: related components and usage examples
- Makes the change with full context
- Updates metadata and reports impacts

**Output:** Updated component with ecosystem awareness.

---

### `/new-component`
**Quick create** - Add a new component interactively.

For when you know what you need and want to create it fast.

```bash
/new-component
```

**What it does:**
- Prompts: type, name, description
- Creates file with proper header template
- Shows registry.json entry to add
- Reminds about spec updates

**Output:** New component file ready to implement.

---

## Real-World Workflows

### 🌱 Discovering a New Framework Integration

You hear about Qwik and wonder if Effect could work with it:

```bash
# 1. Start exploring
/explore "How Effect composes with Qwik's resumability"

# Output shows it's promising - Effect services could resume!

# 2. Formalize the exploration
/new-rfc "Effect with Qwik: Resumable Server Effects"

# Creates RFC with:
# - How Effect.Service composes with Qwik's serialization
# - Proposed components: qwik-loader, qwik-action, qwik-resource
# - Open questions about state serialization

# 3. Design iteration after feedback
/edit-rfc "Separate server-only vs resumable components"

# Updates RFC to split concerns

# 4. Build it when ready
/apply-rfc effect-qwik-rfc

# Creates registry/effect-qwik/ with vendorable components
```

---

### 🔄 Refining Existing Patterns

You've been using `effect-remix` and noticed a pattern:

```bash
# 1. Make the improvement
/edit-component with-effect "extract error mapping helper"

# Loads full context, makes the change

# 2. Document the learning
/edit-rfc "Update effect-remix based on real usage patterns"

# Captures insights for others
```

---

### ⚡ Quick Component Creation

You know exactly what you need:

```bash
/new-component

# Interactive prompts:
#   Type: effect-vite
#   Name: websocket-atom
#   Description: Reactive WebSocket connection with Effect
#
# Creates file, shows next steps
```

---

## Command Philosophy

These commands embody Meta Effect's values:

### 1. **Explore First, Commit Later**
`/explore` lets you think without creating files. Only move to `/new-rfc` when an idea feels solid.

### 2. **Document the Journey**
RFCs capture *why* you made design choices, not just *what* you built. Future you will thank current you.

### 3. **Stay Minimal**
Every command reminds you: keep components ~50-100 lines. If it's growing, split it.

### 4. **Iterate Freely**
`/edit-rfc` embraces that designs evolve. Show your thinking process.

### 5. **Context is King**
`/edit-component` loads everything related before making changes. Edit with awareness, not in isolation.

---

## The Meta Effect Way

```
Question → Explore → Document → Refine → Build → Ship → Learn → Refine
    ↑                                                              ↓
    └──────────────────────────────────────────────────────────────┘
```

Discovery is not linear. These commands support the messy, iterative reality of good design.

**Start exploring**: `/explore "your idea here"`
