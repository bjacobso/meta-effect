/**
 * GitHub Actions Inputs Compiler
 *
 * Compile FormIR to GitHub Actions workflow_dispatch inputs for automated workflows.
 *
 * @example
 * ```ts
 * import { toGithubInputs } from './lib/effect-forms/form-to-github-inputs'
 * import YAML from 'yaml'
 *
 * const ghInputs = toGithubInputs(myForm)
 * const workflow = {
 *   name: "My Workflow",
 *   on: { workflow_dispatch: { inputs: ghInputs } },
 *   jobs: { ... }
 * }
 * console.log(YAML.stringify(workflow))
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { FormIR, Field } from "./form-schema.js"

export interface GithubInput {
  description: string
  required?: boolean
  default?: string | boolean | number
  type?: "string" | "choice" | "boolean" | "number"
  options?: string[]
}

const fieldToGithubInput = (field: Field): GithubInput => {
  const base = {
    description: field.label,
    ...(field.required && { required: true })
  }

  switch (field.kind) {
    case "text":
    case "email":
    case "textarea":
      return {
        ...base,
        type: "string" as const,
        ...(field.defaultValue && { default: field.defaultValue })
      }
    case "select":
      return {
        ...base,
        type: "choice" as const,
        options: field.options.map((opt: { value: string; label: string }) => opt.value),
        ...(field.defaultValue && { default: field.defaultValue })
      }
    case "checkbox":
      return {
        ...base,
        type: "boolean" as const,
        ...(field.defaultValue !== undefined && { default: field.defaultValue })
      }
    case "date":
      return {
        ...base,
        type: "string" as const,
        ...(field.defaultValue && { default: field.defaultValue })
      }
    case "number":
      return {
        ...base,
        type: "number" as const,
        ...(field.defaultValue !== undefined && { default: field.defaultValue })
      }
    default:
      return base
  }
}

export const toGithubInputs = (form: FormIR): Record<string, GithubInput> => {
  const inputs: Record<string, GithubInput> = {}

  for (const field of form.fields) {
    inputs[field.id] = fieldToGithubInput(field)
  }

  return inputs
}
