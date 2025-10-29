/**
 * EmployeesList Component
 *
 * Pure component that displays a list of employees.
 * Depends only on domain types - never fetches data directly.
 */

import * as React from "react"
import type { Employee } from "@acme/domain/employee"

export interface EmployeesListProps {
  employees: ReadonlyArray<Employee>
  onSelect?: (id: Employee["id"]) => void
}

export function EmployeesList({ employees, onSelect }: EmployeesListProps) {
  return (
    <div className="grid gap-2">
      {employees.map((e) => (
        <button
          key={e.id}
          className="rounded-2xl p-3 shadow hover:shadow-lg transition-shadow text-left"
          onClick={() => onSelect?.(e.id)}
        >
          <div className="font-medium">{e.name}</div>
          <div className="text-sm opacity-70">{e.email}</div>
          <div className="text-xs mt-1">
            <span className="inline-block px-2 py-1 rounded bg-gray-100">
              {e.role}
            </span>
            {e.active && (
              <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 ml-2">
                Active
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
