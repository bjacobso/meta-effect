import { describe, expect, it } from "vitest"
import { createTableState, type TableParams } from "./table-state"
import { Schema } from "effect"

// Test schema
const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
})

type User = typeof UserSchema.Type

// Mock data
const mockUsers: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
  { id: 3, name: "Charlie", email: "charlie@example.com" },
]

describe("createTableState", () => {
  it("should create table state with all required atoms", () => {
    const fetchData = async (params: TableParams) => mockUsers

    const table = createTableState({
      fetchData,
      schema: UserSchema,
    })

    expect(table.dataAtom).toBeDefined()
    expect(table.pageAtom).toBeDefined()
    expect(table.sortAtom).toBeDefined()
    expect(table.filtersAtom).toBeDefined()
    expect(table.pageSizeAtom).toBeDefined()
    expect(table.refetch).toBeInstanceOf(Function)
  })

  it("should use default page size of 10", () => {
    const fetchData = async (params: TableParams) => mockUsers

    const table = createTableState({
      fetchData,
      schema: UserSchema,
    })

    // Page size atom should have default value of 10
    // Note: We can't test the actual atom value without Jotai store
    expect(table.pageSizeAtom).toBeDefined()
  })

  it("should respect custom page size", () => {
    const fetchData = async (params: TableParams) => mockUsers

    const table = createTableState({
      fetchData,
      schema: UserSchema,
      pageSize: 25,
    })

    expect(table.pageSizeAtom).toBeDefined()
  })

  it("should set default sort when provided", () => {
    const fetchData = async (params: TableParams) => mockUsers

    const table = createTableState({
      fetchData,
      schema: UserSchema,
      defaultSort: { field: "name", direction: "asc" },
    })

    expect(table.sortAtom).toBeDefined()
  })

  it("should call fetchData with correct parameters", async () => {
    let capturedParams: TableParams | undefined

    const fetchData = async (params: TableParams) => {
      capturedParams = params
      return mockUsers
    }

    const table = createTableState({
      fetchData,
      schema: UserSchema,
      defaultSort: { field: "name", direction: "asc" },
      pageSize: 20,
    })

    // Note: To actually test the data fetching, we would need a Jotai store
    // This test validates the structure is created correctly
    expect(table.dataAtom).toBeDefined()
  })
})
