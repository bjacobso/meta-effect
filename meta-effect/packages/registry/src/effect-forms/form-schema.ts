/**
 * Form Schema (Type-Safe Form IR)
 *
 * Effect Schema types for declarative form definitions that compile to multiple targets
 * (JSON Schema, GitHub Actions, React components, etc).
 *
 * @example
 * ```ts
 * import { FormIR } from './lib/effect-forms/form-schema'
 *
 * const loginForm: FormIR = {
 *   id: "user_login",
 *   title: "User Login",
 *   fields: [
 *     { kind: "email", id: "email", label: "Email", required: true },
 *     { kind: "text", id: "password", label: "Password", required: true }
 *   ]
 * }
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Schema as S } from "effect"

// AI hints for semantic field information
export const AIHints = S.Struct({
  intent: S.optional(S.String),
  synonyms: S.optional(S.Array(S.String)),
  examples: S.optional(S.Record({ key: S.String, value: S.String })),
  pii: S.optional(S.Boolean),
  classification: S.optional(S.String)
})

export type AIHints = S.Schema.Type<typeof AIHints>

// Base field properties
const FieldBase = S.Struct({
  id: S.String,
  label: S.String,
  required: S.optional(S.Boolean),
  when: S.optional(S.String),
  ai: S.optional(AIHints)
})

// Field type definitions
export const FieldText = S.extend(FieldBase, S.Struct({
  kind: S.Literal("text"),
  placeholder: S.optional(S.String),
  defaultValue: S.optional(S.String),
  pattern: S.optional(S.String),
  minLength: S.optional(S.Number),
  maxLength: S.optional(S.Number)
}))

export const FieldEmail = S.extend(FieldBase, S.Struct({
  kind: S.Literal("email"),
  placeholder: S.optional(S.String),
  defaultValue: S.optional(S.String)
}))

export const FieldTextarea = S.extend(FieldBase, S.Struct({
  kind: S.Literal("textarea"),
  placeholder: S.optional(S.String),
  defaultValue: S.optional(S.String),
  minLength: S.optional(S.Number),
  maxLength: S.optional(S.Number)
}))

export const FieldSelect = S.extend(FieldBase, S.Struct({
  kind: S.Literal("select"),
  options: S.Array(S.Struct({ value: S.String, label: S.String })),
  defaultValue: S.optional(S.String)
}))

export const FieldCheckbox = S.extend(FieldBase, S.Struct({
  kind: S.Literal("checkbox"),
  defaultValue: S.optional(S.Boolean)
}))

export const FieldDate = S.extend(FieldBase, S.Struct({
  kind: S.Literal("date"),
  defaultValue: S.optional(S.String),
  min: S.optional(S.String),
  max: S.optional(S.String)
}))

export const FieldNumber = S.extend(FieldBase, S.Struct({
  kind: S.Literal("number"),
  placeholder: S.optional(S.String),
  defaultValue: S.optional(S.Number),
  min: S.optional(S.Number),
  max: S.optional(S.Number),
  step: S.optional(S.Number)
}))

// Union of all field types
export const Field = S.Union(
  FieldText,
  FieldEmail,
  FieldTextarea,
  FieldSelect,
  FieldCheckbox,
  FieldDate,
  FieldNumber
)

export type Field = S.Schema.Type<typeof Field>

// Complete form definition
export const FormIR = S.Struct({
  id: S.String,
  title: S.optional(S.String),
  description: S.optional(S.String),
  fields: S.Array(Field)
})

export type FormIR = S.Schema.Type<typeof FormIR>
