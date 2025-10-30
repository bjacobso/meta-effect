/**
 * EmployeeRow Component
 *
 * Pure component that displays a single employee's details.
 * Can be used in tables, cards, or detail views.
 */

import * as React from "react"
import type { Employee } from "@acme/domain/employee"

export interface EmployeeRowProps {
  employee: Employee
  onEdit?: (employee: Employee) => void
}

export function EmployeeRow({ employee, onEdit }: EmployeeRowProps) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{employee.name}</h2>
          <p className="text-gray-600 mt-1">{employee.email}</p>
          <div className="flex gap-2 mt-2">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
              {employee.role}
            </span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                employee.active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {employee.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(employee)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
