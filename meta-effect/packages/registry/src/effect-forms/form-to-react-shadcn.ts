/**
 * React/Shadcn Component Generator
 *
 * Generate React component source code from FormIR with Zod validation and shadcn/ui components.
 *
 * @example
 * ```ts
 * import { toReactShadcn } from './lib/effect-forms/form-to-react-shadcn'
 * import fs from 'node:fs'
 *
 * const componentSource = toReactShadcn(myForm, {
 *   componentName: "MyForm",
 *   validation: "zod"
 * })
 * fs.writeFileSync("src/components/MyForm.tsx", componentSource)
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { FormIR, Field } from "./form-schema.js"

export interface ReactOptions {
  componentName?: string
  validation?: "zod" | "none"
  imports?: {
    Input?: string
    Select?: string
    Checkbox?: string
    Textarea?: string
    Button?: string
    Label?: string
  }
}

const defaultImports = {
  Input: "@/components/ui/input",
  Select: "@/components/ui/select",
  Checkbox: "@/components/ui/checkbox",
  Textarea: "@/components/ui/textarea",
  Button: "@/components/ui/button",
  Label: "@/components/ui/label"
}

const fieldToZodSchema = (field: Field): string => {
  switch (field.kind) {
    case "text":
      let schema = "z.string()"
      if (field.pattern) schema += `.regex(/${field.pattern}/)`
      if (field.minLength) schema += `.min(${field.minLength})`
      if (field.maxLength) schema += `.max(${field.maxLength})`
      if (!field.required) schema += ".optional()"
      return schema
    case "email":
      return field.required ? "z.string().email()" : "z.string().email().optional()"
    case "textarea":
      let textareaSchema = "z.string()"
      if (field.minLength) textareaSchema += `.min(${field.minLength})`
      if (field.maxLength) textareaSchema += `.max(${field.maxLength})`
      if (!field.required) textareaSchema += ".optional()"
      return textareaSchema
    case "select": {
      const values = field.options.map((o: { value: string; label: string }) => `"${o.value}"`).join(", ")
      return field.required ? `z.enum([${values}])` : `z.enum([${values}]).optional()`
    }
    case "checkbox":
      return field.required ? "z.boolean()" : "z.boolean().optional()"
    case "date":
      return field.required ? "z.string()" : "z.string().optional()"
    case "number": {
      let numSchema = "z.number()"
      if (field.min !== undefined) numSchema += `.min(${field.min})`
      if (field.max !== undefined) numSchema += `.max(${field.max})`
      if (!field.required) numSchema += ".optional()"
      return numSchema
    }
    default:
      return ""
  }
}

const generateFieldComponent = (field: Field): string => {
  const conditional = field.when ? `{show${capitalize(field.id)} && (` : ""
  const conditionalEnd = field.when ? ")}": ""

  switch (field.kind) {
    case "text":
    case "email":
      return `${conditional}
      <div>
        <Label htmlFor="${field.id}">${field.label}</Label>
        <Input
          id="${field.id}"
          type="${field.kind === "email" ? "email" : "text"}"
          ${field.placeholder ? `placeholder="${field.placeholder}"` : ""}
          ${field.required ? "required" : ""}
          value={values.${field.id} ?? ""}
          onChange={(e) => setValues({ ...values, ${field.id}: e.target.value })}
        />
        {errors.${field.id} && <p className="text-sm text-red-500">{errors.${field.id}}</p>}
      </div>${conditionalEnd}`
    case "textarea":
      return `${conditional}
      <div>
        <Label htmlFor="${field.id}">${field.label}</Label>
        <Textarea
          id="${field.id}"
          ${field.placeholder ? `placeholder="${field.placeholder}"` : ""}
          value={values.${field.id} ?? ""}
          onChange={(e) => setValues({ ...values, ${field.id}: e.target.value })}
        />
        {errors.${field.id} && <p className="text-sm text-red-500">{errors.${field.id}}</p>}
      </div>${conditionalEnd}`
    case "select": {
      return `${conditional}
      <div>
        <Label htmlFor="${field.id}">${field.label}</Label>
        <Select value={values.${field.id}} onValueChange={(v) => setValues({ ...values, ${field.id}: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            ${field.options.map((opt: { value: string; label: string }) => `<SelectItem value="${opt.value}">${opt.label}</SelectItem>`).join("\n            ")}
          </SelectContent>
        </Select>
      </div>${conditionalEnd}`
    }
    case "checkbox":
      return `${conditional}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="${field.id}"
          checked={values.${field.id} ?? false}
          onCheckedChange={(checked) => setValues({ ...values, ${field.id}: checked })}
        />
        <Label htmlFor="${field.id}">${field.label}</Label>
      </div>${conditionalEnd}`
    case "date":
      return `${conditional}
      <div>
        <Label htmlFor="${field.id}">${field.label}</Label>
        <Input
          id="${field.id}"
          type="date"
          value={values.${field.id} ?? ""}
          onChange={(e) => setValues({ ...values, ${field.id}: e.target.value })}
        />
      </div>${conditionalEnd}`
    case "number":
      return `${conditional}
      <div>
        <Label htmlFor="${field.id}">${field.label}</Label>
        <Input
          id="${field.id}"
          type="number"
          ${field.min !== undefined ? `min="${field.min}"` : ""}
          ${field.max !== undefined ? `max="${field.max}"` : ""}
          ${field.step ? `step="${field.step}"` : ""}
          value={values.${field.id} ?? ""}
          onChange={(e) => setValues({ ...values, ${field.id}: parseFloat(e.target.value) })}
        />
      </div>${conditionalEnd}`
    default:
      return ""
  }
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

const parseWhenExpression = (when: string): string => {
  // Simple parser for expressions like "environment == 'production'"
  return when.replace(/(\w+)\s*==\s*['"]([^'"]+)['"]/g, 'values.$1 === "$2"')
}

export const toReactShadcn = (form: FormIR, options: ReactOptions = {}): string => {
  const componentName = options.componentName ?? capitalize(form.id.replace(/_/g, "")) + "Form"
  const validation = options.validation ?? "zod"
  const imports = { ...defaultImports, ...options.imports }

  const schemaFields = form.fields.map((f: Field) => `  ${f.id}: ${fieldToZodSchema(f)}`).join(",\n")

  const defaultValues = form.fields
    .filter((f: Field) => f.defaultValue !== undefined)
    .map((f: Field) => `    ${f.id}: ${typeof f.defaultValue === "string" ? `"${f.defaultValue}"` : f.defaultValue}`)
    .join(",\n")

  const conditionalVisibility = form.fields
    .filter((f: Field) => f.when)
    .map((f: Field) => `  const show${capitalize(f.id)} = ${parseWhenExpression(f.when!)}`)
    .join("\n")

  return `import { useState } from "react"
import { Input } from "${imports.Input}"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "${imports.Select}"
import { Checkbox } from "${imports.Checkbox}"
import { Textarea } from "${imports.Textarea}"
import { Button } from "${imports.Button}"
import { Label } from "${imports.Label}"
${validation === "zod" ? 'import { z } from "zod"' : ""}

${validation === "zod" ? `const schema = z.object({
${schemaFields}
})

export type ${componentName}Data = z.infer<typeof schema>` : ""}

export function ${componentName}({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [values, setValues] = useState<any>({${defaultValues ? `\n${defaultValues}\n  ` : ""}})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
${validation === "zod" ? `    const result = schema.safeParse(values)
    if (result.success) {
      onSubmit(result.data)
    } else {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message
      })
      setErrors(fieldErrors)
    }` : `    onSubmit(values)`}
  }

${conditionalVisibility}

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      ${form.fields.map((f: Field) => generateFieldComponent(f)).join("\n\n      ")}

      <Button type="submit">Submit</Button>
    </form>
  )
}
`
}
