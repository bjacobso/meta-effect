/**
 * In-Memory Employee Repository
 *
 * Simple implementation for development and testing.
 * Can be swapped for Prisma, Drizzle, or other adapters.
 */

import { Effect, Ref } from "effect"
import { NoSuchElementException } from "effect/Cause"
import type { Employee, EmployeeId, EmployeeRepo, Email } from "@acme/domain/employee"

// Mock data
const initialEmployees: ReadonlyArray<Employee> = [
  {
    id: "e1" as EmployeeId,
    name: "Ada Lovelace",
    email: "ada@acme.com" as Email,
    role: "engineer",
    active: true,
  },
  {
    id: "e2" as EmployeeId,
    name: "Grace Hopper",
    email: "grace@acme.com" as Email,
    role: "engineer",
    active: true,
  },
  {
    id: "e3" as EmployeeId,
    name: "Margaret Hamilton",
    email: "margaret@acme.com" as Email,
    role: "manager",
    active: true,
  },
]

export const makeInMemoryEmployeeRepo = (): Effect.Effect<EmployeeRepo, never> =>
  Effect.gen(function* () {
    const store = yield* Ref.make(new Map(initialEmployees.map((e) => [e.id, e])))

    return {
      list: () =>
        Ref.get(store).pipe(
          Effect.map((map) => Array.from(map.values()))
        ),

      get: (id: EmployeeId) =>
        Ref.get(store).pipe(
          Effect.flatMap((map) => {
            const employee = map.get(id)
            return employee
              ? Effect.succeed(employee)
              : Effect.fail(new NoSuchElementException(`Employee ${id} not found`))
          })
        ),

      upsert: (employee: Employee) =>
        Ref.update(store, (map) => new Map(map).set(employee.id, employee)).pipe(
          Effect.as(employee)
        ),
    } as const
  })
