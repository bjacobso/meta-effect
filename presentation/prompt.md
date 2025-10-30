# Meta Effect Presentation Prompt

When generating slides for Meta Effect presentations, create a lightning talk that feels alive, irreverent, meta-aware, and visionary. The presentation should sound like a hacker manifesto meets a New Yorker cartoon meets a Vite demo - tuned for short, high-impact meetup slots.

Make sure the presentation conveys concrete, specific language, avoids abstract nouns, and maintains the philosophy that "Meta Effect is not a framework, not an npm package - it's a vibe."

**Any specific instructions about presentation content or structure should supersede these defaults.**

---

## Act 1 — The Hook

> *"What if integrating Effect felt like copying a component from shadcn/ui?"*

Every framework tells you what to do.
Every npm package traps you in version purgatory.
You don't *own* your tools anymore.

**Meta Effect flips that.**
It's *copy–paste architecture*.
Every component is ~50 lines of pure Effect.
You vendor it, tweak it, own it.
No updates. No lock-in. No drama.

---

## Act 2 — The Pattern

> *"Not a framework — a library of living blueprints."*

Each component = one well-lit example of Effect at work:

* `effect-vite` → bootstrapping Vite as an Effect service
* `effect-remix` → turning Remix actions into typed Effects
* `effect-ci` → DAG runner for GitHub workflows
* `effect-livestore` → local-first reactive storage

They all *fit in your head.*
Each file is a poem about dependency injection.

---

## Act 3 — The Demo (Show, Don't Tell)

```bash
npx meta-effect add vite
```

Now open the file.
Everything you see — you can understand.
You can fork the universe from here.

Copy → Customize → Compose.
That's the loop.

---

## Act 4 — The Philosophy

npm packages say: "trust us."
Meta Effect says: "own this."

* No versioning.
* No abstraction hiding.
* No secret runtime.
* Every operation is an Effect.
* Every abstraction is transparent.
* Every component teaches you something.

> *"If it's over 100 lines, it's not a component — it's a framework."*

---

## Act 5 — The Art + Science Bit

This isn't just code.
It's a **living design lab**.

* **Art Project:** Specs are design manifestos.
  "What *could* an Effect-first world look like?"
* **Science Experiment:** None of these components *work perfectly yet.*
  That's intentional.
  The repo is a garden, not a museum.

> "The bugs are the research questions."

---

## Act 6 — Specs as the New Source Code

Specs live in `docs/specs/`.
They describe what *should* exist — API surface, DSL, examples.
The implementation comes later.

Specs are executable philosophy:

* `status: "planned"` = aspirational
* `status: "implemented"` = iteration one
* `status: "deprecated"` = evolution complete

This model is built for AI-assisted collaboration.
Specs are small enough to fit in a context window.
Vendored code is small enough to rewrite.
That's how agents will help us maintain code at scale.

---

## Act 7 — The Invitation

Two paths:

1. **Implement the spec.**
   Submit a 50-line component.
2. **Challenge the spec.**
   Rewrite the design. Prove it better.

No gatekeepers.
Just consensus through code.

---

## Act 8 — Closing

> "The future of code isn't frameworks.
> It's living specifications."

Copy. Paste. Own.
That's the Meta Effect.

---

## Slide Design Principles

- Use v-click for progressive disclosure
- Keep code examples focused and readable
- Use two-cols layout for comparisons
- Center text for dramatic moments
- Tight, lightning-talk rhythm (15-18 slides, 5 minutes)
- No emoji unless explicitly requested
- Monospace-friendly formatting
- Dramatic effect through spacing and pauses

## Target Audience

- Effect-TS developers and enthusiasts
- Developers frustrated with framework lock-in
- Open source maintainers exploring new models
- AI/LLM tooling builders
- Hacker/builder community at meetups

## Compilation Notes

- Compile into Slidev-ready format with centered text
- Use Acts 1-8 structure for organization
- Include `v-click` transitions for dramatic reveals
- Code samples should be minimal and illustrative
- Maintain conversational, irreverent tone throughout
- Each slide should feel punchy and quotable
