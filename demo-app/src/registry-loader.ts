/**
 * Registry Loader
 *
 * Loads registry.json and component source files using Effect
 */

import { Effect, Schema } from "effect"
import type { Registry, RegistryComponent, ComponentWithCode } from "./registry-types"

// Registry files are copied to public directory at build time
const REGISTRY_BASE = "/registry"

export const loadRegistry = (): Effect.Effect<Registry, Error> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`${REGISTRY_BASE}/registry.json`)
      if (!response.ok) {
        throw new Error(`Failed to load registry: ${response.statusText}`)
      }
      return await response.json() as Registry
    },
    catch: (error) => new Error(`Failed to load registry: ${String(error)}`)
  })

export const loadComponentCode = (component: RegistryComponent): Effect.Effect<ComponentWithCode, Error> =>
  Effect.tryPromise({
    try: async () => {
      // Load the first file (most components have one file)
      const filePath = component.files[0]
      const response = await fetch(`${REGISTRY_BASE}/src/${filePath}`)
      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}: ${response.statusText}`)
      }
      const code = await response.text()
      return {
        ...component,
        code
      }
    },
    catch: (error) => new Error(`Failed to load component code: ${String(error)}`)
  })

export const loadAllComponents = (): Effect.Effect<ComponentWithCode[], Error> =>
  Effect.gen(function* () {
    const registry = yield* loadRegistry()
    const components = yield* Effect.all(
      registry.components.map(loadComponentCode),
      { concurrency: 5 }
    )
    return components
  })

export const groupComponentsByType = (components: ComponentWithCode[]): Map<string, ComponentWithCode[]> => {
  const grouped = new Map<string, ComponentWithCode[]>()
  for (const component of components) {
    const existing = grouped.get(component.type) ?? []
    grouped.set(component.type, [...existing, component])
  }
  return grouped
}
