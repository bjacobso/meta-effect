/**
 * Form State Management
 *
 * Jotai atoms for managing form state with Effect Schema validation.
 * Provides type-safe form state with automatic validation and error handling.
 *
 * @example
 * ```ts
 * import { atom, useAtom } from 'jotai'
 * import { createFormState } from './lib/effect-ui/form-state'
 * import { Schema } from 'effect'
 *
 * // Define form schema
 * const LoginSchema = Schema.Struct({
 *   email: Schema.String.pipe(Schema.minLength(1)),
 *   password: Schema.String.pipe(Schema.minLength(8))
 * })
 *
 * // Create form state
 * const loginForm = createFormState({
 *   schema: LoginSchema,
 *   onSubmit: async (data) => {
 *     return await api.login(data)
 *   }
 * })
 *
 * // Use in component
 * const [values, setValues] = useAtom(loginForm.valuesAtom)
 * const [errors] = useAtom(loginForm.errorsAtom)
 * const [, submit] = useAtom(loginForm.submitAtom)
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { atom, type WritableAtom } from 'jotai'
import { Schema, ParseResult, Effect } from 'effect'

export interface FormStateOptions<T> {
  /** Effect Schema for validation */
  schema: Schema.Schema<T, any>
  /** Submit handler */
  onSubmit: (data: T) => Promise<void>
  /** Initial values */
  initialValues?: Partial<T>
}

export interface FormState<T> {
  /** Atom containing form field values */
  valuesAtom: WritableAtom<Partial<T>, [Partial<T>], void>
  /** Atom containing validation errors */
  errorsAtom: WritableAtom<Record<string, string>, [], Record<string, string>>
  /** Atom for submitting the form */
  submitAtom: WritableAtom<null, [], Promise<void>>
  /** Atom tracking submission state */
  isSubmittingAtom: WritableAtom<boolean, [], boolean>
  /** Reset form to initial values */
  resetAtom: WritableAtom<null, [], void>
}

/**
 * Create form state with validation and submission handling
 */
export function createFormState<T>(
  options: FormStateOptions<T>
): FormState<T> {
  const { schema, onSubmit, initialValues = {} } = options

  // Form field values
  const valuesAtom = atom<Partial<T>>(initialValues)

  // Validation errors
  const errorsAtom = atom<Record<string, string>>({})

  // Submission state
  const isSubmittingAtom = atom<boolean>(false)

  // Submit atom that validates and submits
  const submitAtom = atom(
    null,
    async (get, set) => {
      const values = get(valuesAtom)

      // Clear previous errors
      set(errorsAtom, {})
      set(isSubmittingAtom, true)

      try {
        // Validate with Effect Schema
        const parseEffect = Schema.decodeUnknown(schema)(values)
        const result = await Effect.runPromise(Effect.either(parseEffect))

        if (result._tag === 'Left') {
          // Validation failed - extract field errors
          const error = result.left
          const fieldErrors: Record<string, string> = {}

          // Parse validation errors (simplified)
          fieldErrors['_form'] = ParseResult.TreeFormatter.formatErrorSync(error)

          set(errorsAtom, fieldErrors)
          set(isSubmittingAtom, false)
          return
        }

        // Submit valid data
        await onSubmit(result.right)
        set(isSubmittingAtom, false)
      } catch (error) {
        set(errorsAtom, { _form: String(error) })
        set(isSubmittingAtom, false)
      }
    }
  )

  // Reset atom
  const resetAtom = atom(
    null,
    (get, set) => {
      set(valuesAtom, initialValues)
      set(errorsAtom, {})
      set(isSubmittingAtom, false)
    }
  )

  return {
    valuesAtom,
    errorsAtom,
    submitAtom,
    isSubmittingAtom,
    resetAtom,
  }
}
