import { describe, expect, it } from "vitest"
import { toGithubInputs } from "./form-to-github-inputs"
import type { FormIR } from "./form-schema"

describe("form-to-github-inputs", () => {
  it("should compile text field to string input", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "text",
          id: "version",
          label: "Version Tag",
          required: true,
        },
      ],
    }

    const inputs = toGithubInputs(form)

    expect(inputs.version).toMatchObject({
      description: "Version Tag",
      type: "string",
      required: true,
    })
  })

  it("should compile select field to choice input", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "select",
          id: "environment",
          label: "Environment",
          options: [
            { value: "staging", label: "Staging" },
            { value: "production", label: "Production" },
          ],
          defaultValue: "staging",
          required: true,
        },
      ],
    }

    const inputs = toGithubInputs(form)

    expect(inputs.environment).toMatchObject({
      description: "Environment",
      type: "choice",
      options: ["staging", "production"],
      default: "staging",
      required: true,
    })
  })

  it("should compile checkbox to boolean input", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "checkbox",
          id: "notify",
          label: "Notify team",
          defaultValue: false,
        },
      ],
    }

    const inputs = toGithubInputs(form)

    expect(inputs.notify).toMatchObject({
      description: "Notify team",
      type: "boolean",
      default: false,
      required: false,
    })
  })

  it("should compile number field to number input", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "number",
          id: "timeout",
          label: "Timeout (seconds)",
          defaultValue: 300,
        },
      ],
    }

    const inputs = toGithubInputs(form)

    expect(inputs.timeout).toMatchObject({
      description: "Timeout (seconds)",
      type: "number",
      default: "300",
    })
  })

  it("should skip conditional fields", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "text",
          id: "always",
          label: "Always shown",
          required: true,
        },
        {
          kind: "text",
          id: "conditional",
          label: "Conditional field",
          when: "always == 'value'",
        },
      ],
    }

    const inputs = toGithubInputs(form)

    expect(inputs.always).toBeDefined()
    expect(inputs.conditional).toBeUndefined()
  })

  it("should handle optional fields", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "textarea",
          id: "notes",
          label: "Release Notes",
          required: false,
        },
      ],
    }

    const inputs = toGithubInputs(form)

    expect(inputs.notes).toMatchObject({
      description: "Release Notes",
      type: "string",
      required: false,
    })
  })

  it("should compile multiple fields", () => {
    const form: FormIR = {
      id: "release",
      fields: [
        { kind: "text", id: "version", label: "Version", required: true },
        {
          kind: "select",
          id: "target",
          label: "Target",
          options: [
            { value: "prod", label: "Production" },
            { value: "stage", label: "Staging" },
          ],
          required: true,
        },
        { kind: "checkbox", id: "dryRun", label: "Dry run", defaultValue: true },
      ],
    }

    const inputs = toGithubInputs(form)

    expect(Object.keys(inputs)).toHaveLength(3)
    expect(inputs.version.type).toBe("string")
    expect(inputs.target.type).toBe("choice")
    expect(inputs.dryRun.type).toBe("boolean")
  })
})
