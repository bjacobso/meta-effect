/**
 * Route Atom Component
 *
 * Synchronizes atoms with URL search params and route params.
 * Changes to the atom automatically update the URL, and URL changes
 * update the atom - providing two-way binding with the browser location.
 *
 * @example
 * ```ts
 * import { Schema } from 'effect'
 * import { routeAtom } from './lib/effect-vite/route-atom'
 *
 * // Search params atom - synced with URL query string
 * const searchAtom = routeAtom.searchParams({
 *   schema: Schema.Struct({
 *     query: Schema.optionalWith(Schema.String, { default: () => "" }),
 *     page: Schema.optionalWith(Schema.NumberFromString, { default: () => 1 })
 *   })
 * })
 *
 * // Usage in component
 * function SearchInput() {
 *   const [search, setSearch] = useAtom(searchAtom)
 *
 *   return (
 *     <input
 *       value={search.query}
 *       onChange={(e) => setSearch({ ...search, query: e.target.value })}
 *     />
 *   )
 * }
 * // URL automatically updates: /?query=hello&page=1
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { atom, type WritableAtom } from 'jotai'
import type { Schema } from 'effect'

export interface RouteAtomOptions<A> {
  /** Effect Schema for validation and parsing */
  schema: Schema.Schema<A, any, never>
  /** Optional default value */
  default?: A
}

/**
 * Create an atom synced with URL search params
 */
function searchParams<A>(options: RouteAtomOptions<A>): WritableAtom<A, [A], void> {
  const { schema, default: defaultValue } = options

  return atom(
    (get) => {
      // Read from URL search params
      if (typeof window === 'undefined') {
        return defaultValue as A
      }

      const params = new URLSearchParams(window.location.search)
      const obj: Record<string, any> = {}

      for (const [key, value] of params.entries()) {
        obj[key] = value
      }

      // Parse with Effect Schema
      try {
        return Schema.decodeSync(schema)(obj)
      } catch {
        return defaultValue as A
      }
    },
    (get, set, newValue: A) => {
      // Write to URL search params
      if (typeof window === 'undefined') return

      const params = new URLSearchParams()

      for (const [key, value] of Object.entries(newValue as any)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value))
        }
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`
      window.history.pushState({}, '', newUrl)
    }
  )
}

/**
 * Create an atom synced with route params (from react-router, etc.)
 */
function params<A>(options: RouteAtomOptions<A>): WritableAtom<A, [A], void> {
  const { schema, default: defaultValue } = options

  // This is a placeholder - actual implementation depends on your router
  // For React Router: use useParams() hook
  // For Remix: use loader params

  return atom(
    (get) => {
      // Read from route params
      // This needs to be connected to your routing solution
      return defaultValue as A
    },
    (get, set, newValue: A) => {
      // Route params are typically read-only
      console.warn('[route-atom] Route params are read-only')
    }
  )
}

export const routeAtom = {
  searchParams,
  params
}
