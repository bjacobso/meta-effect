/**
 * Employees List Page
 *
 * Wires atoms (state) with UI components (presentation).
 * Page logic stays minimal - just composition.
 */

import { useAtomValue } from "@acme/atoms/react"
import { employeesListAtom } from "@acme/atoms/employees"
import { EmployeesList } from "@acme/ui/employees/EmployeesList"
import { useNavigate } from "react-router-dom"

export function EmployeesListPage() {
  const employees = useAtomValue(employeesListAtom)
  const navigate = useNavigate()

  return (
    <div className="container">
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "2rem" }}>
        Employees
      </h1>
      <EmployeesList
        employees={employees ?? []}
        onSelect={(id) => navigate(`/employees/${id}`)}
      />
    </div>
  )
}
