---
theme: default
background: https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072
class: text-center
highlighter: shiki
lineNumbers: true
info: |
  ## Meta Effect
  Copy-Paste Architecture for Effect-TS

  A lightning talk about vendorable components
drawings:
  persist: false
transition: slide-left
title: Meta Effect
mdc: true
---

# META EFFECT

Not a framework. Not an npm package. A vibe.

<div class="pt-12">
  <span @click="$slidev.nav.next" class="px-2 py-1 rounded cursor-pointer" hover="bg-white bg-opacity-10">
    Press Space for next page <carbon:arrow-right class="inline"/>
  </span>
</div>

---
layout: center
class: text-center
---

# What if integrating Effect felt like copying a component from shadcn/ui?

<v-click>

<div class="pt-8 text-2xl">

Every framework tells you what to do.

</div>

</v-click>

<v-click>

<div class="pt-4 text-2xl">

Every npm package traps you in version purgatory.

</div>

</v-click>

<v-click>

<div class="pt-4 text-2xl">

You don't *own* your tools anymore.

</div>

</v-click>

---
layout: center
class: text-center
---

# Meta Effect flips that.

<v-click>

<div class="pt-8 text-3xl font-bold">

It's *copy–paste architecture*.

</div>

</v-click>

<v-click>

<div class="pt-12">

Every component is ~50 lines of pure Effect.

You vendor it, tweak it, own it.

**No updates. No lock-in. No drama.**

</div>

</v-click>

---

# Not a framework — a library of living blueprints.

<v-click>

Each component = one well-lit example of Effect at work:

</v-click>

<v-clicks>

* `effect-vite` → bootstrapping Vite as an Effect service
* `effect-remix` → turning Remix actions into typed Effects
* `effect-ci` → DAG runner for GitHub workflows
* `effect-livestore` → local-first reactive storage

</v-clicks>

<v-click>

<div class="pt-8 text-xl italic">

They all *fit in your head.*

Each file is a poem about dependency injection.

</div>

</v-click>

---
layout: center
class: text-center
---

# Show, Don't Tell

```bash
npx meta-effect add vite
```

<v-click>

<div class="pt-8">

Now open the file.

Everything you see — you can understand.

</div>

</v-click>

<v-click>

<div class="pt-8 text-2xl font-bold">

You can fork the universe from here.

</div>

</v-click>

---
layout: center
class: text-center
---

<div class="text-4xl font-bold">

Copy → Customize → Compose

</div>

<v-click>

<div class="pt-12 text-2xl">

That's the loop.

</div>

</v-click>

---
layout: two-cols
---

# npm packages say:

<div class="pt-8 text-3xl italic">

"trust us."

</div>

::right::

<v-click>

# Meta Effect says:

<div class="pt-8 text-3xl italic">

"own this."

</div>

</v-click>

---

# The Philosophy

<v-clicks>

* No versioning.
* No abstraction hiding.
* No secret runtime.
* Every operation is an Effect.
* Every abstraction is transparent.
* Every component teaches you something.

</v-clicks>

<v-click>

<div class="pt-12 text-2xl italic text-center">

*"If it's over 100 lines, it's not a component — it's a framework."*

</div>

</v-click>

---
layout: center
class: text-center
---

# This isn't just code.

<v-click>

<div class="pt-8 text-3xl font-bold">

It's a **living design lab**.

</div>

</v-click>

---
layout: two-cols
---

# Art Project

<v-click>

Specs are design manifestos.

*"What could an Effect-first world look like?"*

</v-click>

::right::

<v-click>

# Science Experiment

None of these components *work perfectly yet.*

That's intentional.

**The repo is a garden, not a museum.**

</v-click>

---
layout: center
class: text-center
---

<div class="text-3xl italic">

"The bugs are the research questions."

</div>

---

# Specs as the New Source Code

Specs live in `docs/specs/`.

They describe what *should* exist — API surface, DSL, examples.

The implementation comes later.

<v-click>

<div class="pt-8">

Specs are executable philosophy:

* `status: "planned"` = aspirational
* `status: "implemented"` = iteration one
* `status: "deprecated"` = evolution complete

</div>

</v-click>

---

# Built for AI-Assisted Collaboration

<v-clicks>

Specs are small enough to fit in a context window.

Vendored code is small enough to rewrite.

That's how agents will help us maintain code at scale.

</v-clicks>

---

# The Invitation

<div class="grid grid-cols-2 gap-12 pt-8">

<div>

<v-click>

## Path 1

**Implement the spec.**

Submit a 50-line component.

</v-click>

</div>

<div>

<v-click>

## Path 2

**Challenge the spec.**

Rewrite the design. Prove it better.

</v-click>

</div>

</div>

<v-click>

<div class="pt-12 text-2xl text-center">

No gatekeepers.

Just consensus through code.

</div>

</v-click>

---
layout: center
class: text-center
---

<div class="text-4xl italic">

"The future of code isn't frameworks.

It's living specifications."

</div>

---
layout: end
class: text-center
---

# Copy. Paste. Own.

<div class="pt-8 text-3xl">

That's the Meta Effect.

</div>

<div class="pt-12 text-xl opacity-75">
  github.com/effect-meta/meta-effect
</div>
