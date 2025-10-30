/**
 * Employee Detail Page
 *
 * Displays a single employee's details using the EmployeeRow component.
 */

import { useAtomValue } from "@acme/atoms/react"
import { employeeByIdAtom } from "@acme/atoms/employees"
import { EmployeeRow } from "@acme/ui/employees/EmployeeRow"
import { useParams, useNavigate } from "react-router-dom"
import type { EmployeeId } from "@acme/domain/employee"

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const employee = useAtomValue(employeeByIdAtom(id as EmployeeId))

  if (!employee) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <button
        onClick={() => navigate("/")}
        style={{
          marginBottom: "1rem",
          padding: "0.5rem 1rem",
          background: "#e2e8f0",
          borderRadius: "0.375rem",
        }}
      >
        ← Back
      </button>
      <EmployeeRow
        employee={employee}
        onEdit={(emp) => {
          console.log("Edit employee:", emp)
          // TODO: Navigate to edit page or open modal
        }}
      />
    </div>
  )
}
