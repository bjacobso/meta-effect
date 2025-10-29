import * as S from "@effect/schema/Schema"
import { Effect } from "effect"
import { NoSuchElementException } from "effect/Cause"

export const EmployeeId = S.String.pipe(S.minLength(1), S.brand("EmployeeId"))
export type EmployeeId = S.Schema.Type<typeof EmployeeId>

export const Email = S.String.pipe(
  S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  S.brand("Email")
)
export type Email = S.Schema.Type<typeof Email>

export const Employee = S.Struct({
  id: EmployeeId,
  name: S.String,
  email: Email,
  role: S.Literal("engineer", "manager", "designer", "ops"),
  active: S.Boolean
})
export type Employee = S.Schema.Type<typeof Employee>

/**
 * Repository interface (ports pattern)
 *
 * This interface defines the contract for employee data access.
 * Implementations can be in-memory, Prisma, Drizzle, etc.
 */
export interface EmployeeRepo {
  list: () => Effect.Effect<ReadonlyArray<Employee>, never>
  get: (id: EmployeeId) => Effect.Effect<Employee, NoSuchElementException>
  upsert: (e: Employee) => Effect.Effect<Employee, never>
}
