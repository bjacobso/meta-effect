/**
 * Framework-agnostic route definitions
 *
 * This tiny DSL ensures FE navigation and BE mounting never drift.
 * Both client and server share the same paths and params.
 */

export const Routes = {
  Employees: {
    list: () => ({ method: "GET" as const, path: "/employees" }),
    byId: (id: string) => ({ method: "GET" as const, path: `/employees/${id}` }),
    upsert: () => ({ method: "PUT" as const, path: "/employees" })
  }
} as const
