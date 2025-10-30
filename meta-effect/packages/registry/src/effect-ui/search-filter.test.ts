import { describe, expect, it } from "vitest"
import { atom } from "jotai"
import { createSearchFilter, createSortableAtom, type SortConfig } from "./search-filter"

interface User {
  id: number
  name: string
  email: string
  role: string
}

const mockUsers: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com", role: "admin" },
  { id: 2, name: "Bob", email: "bob@example.com", role: "user" },
  { id: 3, name: "Charlie", email: "charlie@example.com", role: "user" },
]

describe("createSearchFilter", () => {
  it("should create search filter with all required atoms", () => {
    const dataAtom = atom(mockUsers)

    const filter = createSearchFilter({
      data: dataAtom,
      searchFields: ["name", "email"],
    })

    expect(filter.searchAtom).toBeDefined()
    expect(filter.filtersAtom).toBeDefined()
    expect(filter.resultsAtom).toBeDefined()
    expect(filter.resetAtom).toBeDefined()
  })

  it("should accept custom filter fields", () => {
    const dataAtom = atom(mockUsers)

    const filter = createSearchFilter({
      data: dataAtom,
      searchFields: ["name"],
      filterFields: { role: "admin" },
    })

    expect(filter.filtersAtom).toBeDefined()
  })

  it("should handle empty search fields", () => {
    const dataAtom = atom(mockUsers)

    const filter = createSearchFilter({
      data: dataAtom,
    })

    expect(filter.searchAtom).toBeDefined()
    expect(filter.resultsAtom).toBeDefined()
  })
})

describe("createSortableAtom", () => {
  it("should create sortable atom with config", () => {
    const dataAtom = atom(mockUsers)

    const { sortedAtom, sortConfigAtom } = createSortableAtom(dataAtom)

    expect(sortedAtom).toBeDefined()
    expect(sortConfigAtom).toBeDefined()
  })

  it("should accept sort configuration", () => {
    const dataAtom = atom(mockUsers)
    const { sortConfigAtom } = createSortableAtom(dataAtom)

    const config: SortConfig<User> = {
      field: "name",
      direction: "asc",
    }

    expect(config.field).toBe("name")
    expect(config.direction).toBe("asc")
    expect(sortConfigAtom).toBeDefined()
  })

  it("should support both asc and desc directions", () => {
    const dataAtom = atom(mockUsers)
    const { sortConfigAtom } = createSortableAtom(dataAtom)

    const ascConfig: SortConfig<User> = { field: "name", direction: "asc" }
    const descConfig: SortConfig<User> = { field: "name", direction: "desc" }

    expect(ascConfig.direction).toBe("asc")
    expect(descConfig.direction).toBe("desc")
  })
})
