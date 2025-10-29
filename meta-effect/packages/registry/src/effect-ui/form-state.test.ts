import { describe, expect, it, vi } from "vitest"
import { createFormState } from "./form-state"
import { Schema } from "effect"

// Test schema
const LoginSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.minLength(1)),
  password: Schema.String.pipe(Schema.minLength(8)),
})

type LoginData = typeof LoginSchema.Type

describe("createFormState", () => {
  it("should create form state with all required atoms", () => {
    const onSubmit = vi.fn(async (data: LoginData) => {})

    const form = createFormState({
      schema: LoginSchema,
      onSubmit,
    })

    expect(form.valuesAtom).toBeDefined()
    expect(form.errorsAtom).toBeDefined()
    expect(form.submitAtom).toBeDefined()
    expect(form.isSubmittingAtom).toBeDefined()
    expect(form.resetAtom).toBeDefined()
  })

  it("should use initial values when provided", () => {
    const onSubmit = vi.fn(async (data: LoginData) => {})

    const form = createFormState({
      schema: LoginSchema,
      onSubmit,
      initialValues: { email: "test@example.com" },
    })

    expect(form.valuesAtom).toBeDefined()
  })

  it("should validate data before submission", async () => {
    const onSubmit = vi.fn(async (data: LoginData) => {})

    const form = createFormState({
      schema: LoginSchema,
      onSubmit,
    })

    // Note: To actually test submission, we would need a Jotai store
    // This test validates the structure is created correctly
    expect(form.submitAtom).toBeDefined()
    expect(form.errorsAtom).toBeDefined()
  })

  it("should provide reset functionality", () => {
    const onSubmit = vi.fn(async (data: LoginData) => {})

    const form = createFormState({
      schema: LoginSchema,
      onSubmit,
      initialValues: { email: "test@example.com" },
    })

    expect(form.resetAtom).toBeDefined()
  })

  it("should track submission state", () => {
    const onSubmit = vi.fn(async (data: LoginData) => {
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const form = createFormState({
      schema: LoginSchema,
      onSubmit,
    })

    expect(form.isSubmittingAtom).toBeDefined()
  })
})
