---
theme: default
background: https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070
class: text-center
highlighter: shiki
lineNumbers: true
info: |
  ## Meta Effect Workshop
  Hands-on workshop for building Effect-TS components

  Interactive coding session
drawings:
  persist: false
transition: slide-left
title: Meta Effect Workshop
mdc: true
---

# META EFFECT WORKSHOP

Hands-on: Building Vendorable Components

<div class="pt-12">
  <span @click="$slidev.nav.next" class="px-2 py-1 rounded cursor-pointer" hover="bg-white bg-opacity-10">
    Press Space for next page <carbon:arrow-right class="inline"/>
  </span>
</div>

---
layout: center
class: text-center
---

# Today's Agenda

<v-clicks>

1. Understanding the vendorable component pattern
2. Building your first Effect service
3. Composing components together
4. Testing and customization

</v-clicks>

---
layout: two-cols
---

# What We'll Build

A complete effect-auth component:

<v-clicks>

- JWT validation service
- Auth middleware
- Session management
- Error handling

</v-clicks>

::right::

```ts {all|2-4|6-8|10-12}
// effect-auth/jwt.ts
export class JwtService extends Effect.Service() {
  // Validate tokens
}

// effect-auth/middleware.ts
export const withAuth = (handler) =>
  Effect.gen(function* () { ... })

// effect-auth/session.ts
export class SessionStore extends Effect.Service() {
  // Manage sessions
}
```

---

# Let's Code!

Time to build together.

<div class="pt-8">
  <code>git clone https://github.com/effect-meta/workshop-starter</code>
</div>
