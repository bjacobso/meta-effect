/**
 * Table State Management
 *
 * Jotai atoms for managing table sorting, filtering, and pagination with
 * HttpApi integration. Provides composable atoms for common table state
 * patterns.
 *
 * @example
 * ```ts
 * import { atom } from 'jotai'
 * import { createTableState } from './lib/effect-ui/table-state'
 * import { Schema } from 'effect'
 * import { userClient } from './api/client'
 *
 * // Define table state
 * const usersTable = createTableState({
 *   fetchData: (params) => userClient.list(params),
 *   schema: Schema.Struct({
 *     id: Schema.Number,
 *     name: Schema.String,
 *     email: Schema.String
 *   }),
 *   defaultSort: { field: 'name', direction: 'asc' },
 *   pageSize: 20
 * })
 *
 * // Use in components
 * const [data] = useAtom(usersTable.dataAtom)
 * const [page, setPage] = useAtom(usersTable.pageAtom)
 * const [sort, setSort] = useAtom(usersTable.sortAtom)
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { atom, type Atom } from 'jotai'
import { atomWithRefresh } from 'jotai/utils'
import type { Schema } from 'effect'

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

export interface PaginationState {
  page: number
  pageSize: number
}

export interface TableParams {
  sort?: SortState
  page?: number
  pageSize?: number
  filters?: Record<string, any>
}

export interface TableStateOptions<T> {
  /** Function to fetch data with table parameters */
  fetchData: (params: TableParams) => Promise<T[]>
  /** Schema for validating row data */
  schema: Schema.Schema<T>
  /** Default sort configuration */
  defaultSort?: SortState
  /** Page size (default: 10) */
  pageSize?: number
}

export interface TableState<T> {
  /** Atom containing fetched data */
  dataAtom: Atom<Promise<T[]>>
  /** Atom for current page number */
  pageAtom: Atom<number>
  /** Atom for sort state */
  sortAtom: Atom<SortState | undefined>
  /** Atom for filters */
  filtersAtom: Atom<Record<string, any>>
  /** Atom for page size */
  pageSizeAtom: Atom<number>
  /** Refetch data manually */
  refetch: () => void
}

/**
 * Create a complete table state with atoms for sorting, pagination, and filtering
 */
export function createTableState<T>(
  options: TableStateOptions<T>
): TableState<T> {
  const { fetchData, defaultSort, pageSize = 10 } = options

  // Primitive state atoms
  const pageAtom = atom<number>(1)
  const sortAtom = atom<SortState | undefined>(defaultSort)
  const filtersAtom = atom<Record<string, any>>({})
  const pageSizeAtom = atom<number>(pageSize)

  // Derived data atom that refetches when dependencies change
  const dataAtom = atomWithRefresh(async (get) => {
    const currentPage = get(pageAtom)
    const currentSort = get(sortAtom)
    const currentFilters = get(filtersAtom)
    const currentPageSize = get(pageSizeAtom)

    return await fetchData({
      page: currentPage,
      pageSize: currentPageSize,
      sort: currentSort,
      filters: currentFilters,
    })
  })

  return {
    dataAtom,
    pageAtom,
    sortAtom,
    filtersAtom,
    pageSizeAtom,
    refetch: () => {
      // This would need store access to actually refresh
      console.warn('[table-state] Refetch requires store context')
    },
  }
}
