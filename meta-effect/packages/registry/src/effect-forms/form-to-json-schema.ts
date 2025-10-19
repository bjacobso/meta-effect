/**
 * JSON Schema Compiler
 *
 * Compile FormIR to JSON Schema Draft 7 for validation with Ajv, JSON Schema validators, etc.
 *
 * @example
 * ```ts
 * import { toJsonSchema } from './lib/effect-forms/form-to-json-schema'
 * import Ajv from 'ajv'
 *
 * const jsonSchema = toJsonSchema(myForm)
 * const ajv = new Ajv()
 * const validate = ajv.compile(jsonSchema)
 * const valid = validate({ field1: "value" })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { FormIR, Field } from "./form-schema.js"

export interface JSONSchema7 {
  $schema?: string
  type?: string
  title?: string
  description?: string
  properties?: Record<string, JSONSchema7>
  required?: string[]
  enum?: unknown[]
  default?: unknown
  pattern?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  multipleOf?: number
  format?: string
}

const fieldToSchema = (field: Field): JSONSchema7 => {
  switch (field.kind) {
    case "text":
      return {
        type: "string",
        ...(field.pattern && { pattern: field.pattern }),
        ...(field.minLength && { minLength: field.minLength }),
        ...(field.maxLength && { maxLength: field.maxLength }),
        ...(field.defaultValue && { default: field.defaultValue })
      }
    case "email":
      return {
        type: "string",
        format: "email",
        ...(field.defaultValue && { default: field.defaultValue })
      }
    case "textarea":
      return {
        type: "string",
        ...(field.minLength && { minLength: field.minLength }),
        ...(field.maxLength && { maxLength: field.maxLength }),
        ...(field.defaultValue && { default: field.defaultValue })
      }
    case "select":
      return {
        type: "string",
        enum: field.options.map((opt: { value: string; label: string }) => opt.value),
        ...(field.defaultValue && { default: field.defaultValue })
      }
    case "checkbox":
      return {
        type: "boolean",
        ...(field.defaultValue !== undefined && { default: field.defaultValue })
      }
    case "date":
      return {
        type: "string",
        format: "date",
        ...(field.defaultValue && { default: field.defaultValue })
      }
    case "number":
      return {
        type: "number",
        ...(field.min !== undefined && { minimum: field.min }),
        ...(field.max !== undefined && { maximum: field.max }),
        ...(field.step && { multipleOf: field.step }),
        ...(field.defaultValue !== undefined && { default: field.defaultValue })
      }
    default:
      return { type: "string" }
  }
}

export const toJsonSchema = (form: FormIR): JSONSchema7 => {
  const properties: Record<string, JSONSchema7> = {}
  const required: string[] = []

  for (const field of form.fields) {
    properties[field.id] = fieldToSchema(field)
    if (field.required) {
      required.push(field.id)
    }
  }

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    ...(form.title && { title: form.title }),
    ...(form.description && { description: form.description }),
    properties,
    ...(required.length > 0 && { required })
  }
}
