/**
 * LiveStore Atom Component
 *
 * Reactive Jotai atoms that automatically subscribe to LiveStore queries,
 * providing fine-grained reactivity for UI components.
 *
 * LiveStore queries are automatically reactive - when events mutate the
 * underlying SQLite state, subscribed queries re-execute. This component
 * bridges that reactivity into Jotai's atom model.
 *
 * @example
 * ```ts
 * import { atom } from 'jotai'
 * import { liveStoreAtom } from './lib/effect-livestore/livestore-atom'
 * import { todosTable } from './store/schema'
 *
 * // Create a reactive query atom
 * export const todosAtom = liveStoreAtom({
 *   query: (db) => db.select().from(todosTable).all(),
 *   key: 'todos-list'
 * })
 *
 * // Use in React component
 * function TodoList() {
 *   const todos = useAtomValue(todosAtom)
 *   return <ul>{todos.map(todo => <li key={todo.id}>{todo.text}</li>)}</ul>
 * }
 *
 * // Create a filtered query atom
 * export const completedTodosAtom = liveStoreAtom({
 *   query: (db) =>
 *     db.select().from(todosTable).where(eq(todosTable.completed, true)).all(),
 *   key: 'todos-completed'
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { atom, type Atom } from 'jotai'
import type { LiveStore } from './livestore-service'

export interface LiveStoreAtomOptions<T> {
  /** The query function to subscribe to */
  query: (db: any) => T
  /** Unique key for debugging */
  key: string
}

/**
 * Global LiveStore instance reference
 * Set this when initializing your app with the LiveStore instance
 */
let globalStore: LiveStore | undefined

export function setGlobalLiveStore(store: LiveStore): void {
  globalStore = store
}

/**
 * Create an atom that subscribes to a LiveStore query
 *
 * The atom automatically subscribes to the query when mounted and
 * re-renders components when the query result changes.
 */
export function liveStoreAtom<T>(
  options: LiveStoreAtomOptions<T>
): Atom<T | undefined> {
  const { query, key } = options

  // Create atom that subscribes to LiveStore query
  const baseAtom = atom<T | undefined>((get) => {
    if (!globalStore) {
      console.warn(`[livestore-atom] Store not initialized for "${key}"`)
      return undefined
    }

    // Initial query
    return globalStore.query(query)
  })

  // Add subscription effect
  baseAtom.onMount = (setAtom) => {
    if (!globalStore) {
      console.warn(`[livestore-atom] Store not initialized for "${key}"`)
      return
    }

    // Subscribe to changes
    const unsub = globalStore.subscribe(query, (data) => {
      setAtom(data)
    })

    return unsub
  }

  // Add debug label
  if (process.env.NODE_ENV !== 'production') {
    baseAtom.debugLabel = `livestore:${key}`
  }

  return baseAtom
}

/**
 * Create a family of atoms parameterized by input
 *
 * Useful for queries that depend on dynamic parameters like IDs.
 */
export function liveStoreAtomFamily<Param, T>(
  options: (param: Param) => LiveStoreAtomOptions<T>
) {
  const cache = new Map<string, Atom<T | undefined>>()

  return (param: Param) => {
    const { query, key } = options(param)
    const cacheKey = `${key}:${JSON.stringify(param)}`

    if (!cache.has(cacheKey)) {
      cache.set(cacheKey, liveStoreAtom({ query, key: cacheKey }))
    }

    return cache.get(cacheKey)!
  }
}
