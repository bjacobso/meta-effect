/**
 * Search and Filter State
 *
 * Jotai atoms for managing search, filtering, and sorting of data collections.
 * Composable primitives for building search UIs.
 *
 * @example
 * ```ts
 * import { useAtom } from 'jotai'
 * import { createSearchFilter } from './lib/effect-ui/search-filter'
 * import { Schema } from 'effect'
 *
 * const UserSchema = Schema.Struct({
 *   id: Schema.Number,
 *   name: Schema.String,
 *   email: Schema.String,
 *   role: Schema.String
 * })
 *
 * // Create search/filter state
 * const userFilter = createSearchFilter({
 *   data: usersAtom,
 *   searchFields: ['name', 'email'],
 *   filterFields: { role: 'all' }
 * })
 *
 * // Use in component
 * const [search, setSearch] = useAtom(userFilter.searchAtom)
 * const [filters, setFilters] = useAtom(userFilter.filtersAtom)
 * const [results] = useAtom(userFilter.resultsAtom)
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { atom, type Atom, type WritableAtom } from 'jotai'

export interface SearchFilterOptions<T> {
  /** Atom containing source data */
  data: Atom<T[]>
  /** Fields to search across */
  searchFields?: Array<keyof T>
  /** Default filter values */
  filterFields?: Record<string, any>
}

export interface SearchFilterState<T> {
  /** Search query atom */
  searchAtom: WritableAtom<string, [string], void>
  /** Filter values atom */
  filtersAtom: WritableAtom<Record<string, any>, [Record<string, any>], void>
  /** Filtered results atom */
  resultsAtom: Atom<T[]>
  /** Reset all filters */
  resetAtom: WritableAtom<null, [], void>
}

/**
 * Create search and filter state
 */
export function createSearchFilter<T extends Record<string, any>>(
  options: SearchFilterOptions<T>
): SearchFilterState<T> {
  const { data, searchFields = [], filterFields = {} } = options

  // Search query
  const searchAtom = atom<string>('')

  // Filter values
  const filtersAtom = atom<Record<string, any>>(filterFields)

  // Derived filtered results
  const resultsAtom = atom((get) => {
    const items = get(data)
    const search = get(searchAtom)
    const filters = get(filtersAtom)

    let filtered = items

    // Apply text search
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((item) => {
        return searchFields.some((field) => {
          const value = item[field]
          return String(value).toLowerCase().includes(searchLower)
        })
      })
    }

    // Apply field filters
    for (const [field, filterValue] of Object.entries(filters)) {
      if (filterValue !== 'all' && filterValue !== null && filterValue !== undefined) {
        filtered = filtered.filter((item) => item[field] === filterValue)
      }
    }

    return filtered
  })

  // Reset filters
  const resetAtom = atom(null, (get, set) => {
    set(searchAtom, '')
    set(filtersAtom, filterFields)
  })

  return {
    searchAtom,
    filtersAtom,
    resultsAtom,
    resetAtom,
  }
}

/**
 * Sort configuration
 */
export interface SortConfig<T> {
  field: keyof T
  direction: 'asc' | 'desc'
}

/**
 * Create sortable atom from source data
 */
export function createSortableAtom<T extends Record<string, any>>(
  sourceAtom: Atom<T[]>
): {
  sortedAtom: Atom<T[]>
  sortConfigAtom: WritableAtom<SortConfig<T> | null, [SortConfig<T> | null], void>
} {
  const sortConfigAtom = atom<SortConfig<T> | null>(null)

  const sortedAtom = atom((get) => {
    const items = get(sourceAtom)
    const config = get(sortConfigAtom)

    if (!config) return items

    return [...items].sort((a, b) => {
      const aVal = a[config.field]
      const bVal = b[config.field]

      let comparison = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal)
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      }

      return config.direction === 'asc' ? comparison : -comparison
    })
  })

  return { sortedAtom, sortConfigAtom }
}
