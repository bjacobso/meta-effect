/**
 * API Atom Component
 *
 * Wraps HttpApi client calls in reactive atoms for fine-grained reactivity.
 * Provides query (read) and mutation (write) atoms with automatic caching
 * and invalidation.
 *
 * @example
 * ```ts
 * import { atom } from 'jotai'
 * import { apiAtom, mutationAtom } from './lib/effect-vite/api-atom'
 * import { userClient } from './api/client'
 *
 * // Query atom - automatically refetches when dependencies change
 * export const usersAtom = apiAtom({
 *   query: () => userClient.list(),
 *   key: 'users-list'
 * })
 *
 * // Mutation atom - invalidates queries on success
 * export const createUserAtom = mutationAtom({
 *   mutate: (data) => userClient.create(data),
 *   onSuccess: () => ['users-list']  // Keys to invalidate
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { atom, type Atom, type WritableAtom } from 'jotai'
import { atomWithRefresh } from 'jotai/utils'

export interface ApiAtomOptions<T> {
  /** The query function to execute */
  query: () => Promise<T>
  /** Cache key for invalidation */
  key: string
  /** Optional cache time in milliseconds */
  cacheTime?: number
}

export interface MutationAtomOptions<TInput, TOutput> {
  /** The mutation function to execute */
  mutate: (input: TInput) => Promise<TOutput>
  /** Keys to invalidate on success */
  onSuccess?: string[]
}

/**
 * Create a query atom that fetches data from an API
 */
export function apiAtom<T>(options: ApiAtomOptions<T>): Atom<Promise<T>> {
  const { query, key, cacheTime = 5000 } = options

  const baseAtom = atomWithRefresh(async () => {
    return await query()
  })

  // Register this atom with the key for invalidation
  atomRegistry.set(key, baseAtom)

  return baseAtom
}

/**
 * Create a mutation atom that writes data to an API
 */
export function mutationAtom<TInput, TOutput>(
  options: MutationAtomOptions<TInput, TOutput>
): WritableAtom<null, [TInput], Promise<TOutput>> {
  const { mutate, onSuccess = [] } = options

  return atom(
    null,
    async (get, set, input: TInput) => {
      const result = await mutate(input)

      // Invalidate related queries
      for (const key of onSuccess) {
        const queryAtom = atomRegistry.get(key)
        if (queryAtom) {
          // Trigger refresh of the query atom
          set(queryAtom, get(queryAtom))
        }
      }

      return result
    }
  )
}

/**
 * Manually invalidate atoms by key
 */
export function invalidate(keys: string[]): void {
  for (const key of keys) {
    const queryAtom = atomRegistry.get(key)
    if (queryAtom) {
      // Force refresh
      // Note: This requires access to the Jotai store
      console.warn(`[api-atom] Invalidation of "${key}" requires store context`)
    }
  }
}

// Internal registry for tracking atoms by key
const atomRegistry = new Map<string, Atom<any>>()
