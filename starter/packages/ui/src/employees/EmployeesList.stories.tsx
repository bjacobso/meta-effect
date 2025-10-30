/**
 * Storybook Stories for EmployeesList
 *
 * Demonstrates both pure props mode (fast) and MSW mode (contract-accurate)
 */

import type { Meta, StoryObj } from "@storybook/react"
import { EmployeesList } from "./EmployeesList"
import type { Employee, EmployeeId, Email } from "@acme/domain/employee"

const meta: Meta<typeof EmployeesList> = {
  component: EmployeesList,
  title: "Employees/EmployeesList",
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof EmployeesList>

// Mock data for stories
const mockEmployees: ReadonlyArray<Employee> = [
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
  {
    id: "e4" as EmployeeId,
    name: "Katherine Johnson",
    email: "katherine@acme.com" as Email,
    role: "ops",
    active: false,
  },
]

export const Empty: Story = {
  args: {
    employees: [],
  },
}

export const Basic: Story = {
  args: {
    employees: mockEmployees,
  },
}

export const WithSelection: Story = {
  args: {
    employees: mockEmployees,
    onSelect: (id) => {
      console.log("Selected employee:", id)
    },
  },
}
