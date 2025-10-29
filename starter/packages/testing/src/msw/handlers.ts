/**
 * MSW Request Handlers
 *
 * Mock API handlers that match the HttpApi contract.
 * Used in Storybook and component tests for hermetic testing.
 */

import { http, HttpResponse } from "msw"
import { Routes } from "@acme/routes"
import type { Employee, EmployeeId, Email } from "@acme/domain/employee"

// Mock employee data
const mockEmployees: Employee[] = [
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

export const handlers = [
  // GET /employees
  http.get(Routes.Employees.list().path, () => {
    return HttpResponse.json(mockEmployees)
  }),

  // GET /employees/:id
  http.get("/employees/:id", ({ params }) => {
    const { id } = params
    const employee = mockEmployees.find((e) => e.id === id)

    if (!employee) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(employee)
  }),

  // PUT /employees
  http.put(Routes.Employees.upsert().path, async ({ request }) => {
    const employee = (await request.json()) as Employee

    // In a real implementation, we'd update the mock store
    return HttpResponse.json(employee)
  }),
]
