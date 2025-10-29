/**
 * Employee State Atoms
 *
 * Uses Jotai atoms to bridge reactive UI with Effect-based API clients.
 * Atoms wrap effectful operations and provide React-friendly state.
 */

import { atom } from "jotai"
import { atomFamily } from "jotai/utils"
import { Effect, Runtime } from "effect"
import { HttpClient, HttpClientRequest } from "@effect/platform"
import { EmployeesApi } from "@acme/api/employee"
import type { Employee, EmployeeId } from "@acme/domain/employee"

// Runtime for executing Effects in atoms
const runtime = Runtime.defaultRuntime

/**
 * Create a typed HTTP client for the Employees API
 */
export const makeEmployeesClient = (baseUrl: string) => {
  const client = HttpClient.fetchOk.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl))
  )
  return HttpClient.Client.toHttpApp(client)
}

/**
 * Atom for fetching the list of all employees
 */
export const employeesListAtom = atom(async (): Promise<ReadonlyArray<Employee>> => {
  const client = makeEmployeesClient("/api")

  // TODO: Wire up actual HttpApi client once available
  // For now, return mock data to demonstrate the pattern
  return Runtime.runPromise(runtime)(
    Effect.succeed([
      {
        id: "e1" as EmployeeId,
        name: "Ada Lovelace",
        email: "ada@acme.com" as any,
        role: "engineer" as const,
        active: true
      }
    ])
  )
})

/**
 * Atom family for fetching individual employees by ID
 */
export const employeeByIdAtom = atomFamily((id: EmployeeId) =>
  atom(async (): Promise<Employee | null> => {
    const client = makeEmployeesClient("/api")

    // TODO: Wire up actual HttpApi client once available
    return Runtime.runPromise(runtime)(
      Effect.succeed({
        id,
        name: "Ada Lovelace",
        email: "ada@acme.com" as any,
        role: "engineer" as const,
        active: true
      })
    )
  })
)

/**
 * Atom for upserting an employee
 */
export const upsertEmployeeAtom = atom(
  null,
  async (_get, _set, employee: Employee): Promise<Employee> => {
    const client = makeEmployeesClient("/api")

    // TODO: Wire up actual HttpApi client once available
    return Runtime.runPromise(runtime)(Effect.succeed(employee))
  }
)
