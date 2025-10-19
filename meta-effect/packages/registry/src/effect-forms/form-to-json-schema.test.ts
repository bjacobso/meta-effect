import { describe, expect, it } from "vitest"
import { toJsonSchema } from "./form-to-json-schema"
import type { FormIR } from "./form-schema"

describe("form-to-json-schema", () => {
  it("should compile basic text field", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "text",
          id: "name",
          label: "Name",
          required: true,
          maxLength: 100,
        },
      ],
    }

    const schema = toJsonSchema(form)

    expect(schema.type).toBe("object")
    expect(schema.properties?.name).toMatchObject({
      type: "string",
      maxLength: 100,
    })
    expect(schema.required).toContain("name")
  })

  it("should compile email field with validation", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "email",
          id: "email",
          label: "Email",
          required: true,
        },
      ],
    }

    const schema = toJsonSchema(form)

    expect(schema.properties?.email).toMatchObject({
      type: "string",
      format: "email",
    })
    expect(schema.required).toContain("email")
  })

  it("should compile select field with options", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "select",
          id: "size",
          label: "Size",
          options: [
            { value: "S", label: "Small" },
            { value: "M", label: "Medium" },
            { value: "L", label: "Large" },
          ],
          required: true,
        },
      ],
    }

    const schema = toJsonSchema(form)

    expect(schema.properties?.size).toMatchObject({
      type: "string",
      enum: ["S", "M", "L"],
    })
  })

  it("should compile checkbox field", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "checkbox",
          id: "subscribe",
          label: "Subscribe",
          defaultValue: false,
        },
      ],
    }

    const schema = toJsonSchema(form)

    expect(schema.properties?.subscribe).toMatchObject({
      type: "boolean",
      default: false,
    })
  })

  it("should compile number field with min/max", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "number",
          id: "age",
          label: "Age",
          min: 0,
          max: 150,
        },
      ],
    }

    const schema = toJsonSchema(form)

    expect(schema.properties?.age).toMatchObject({
      type: "number",
      minimum: 0,
      maximum: 150,
    })
  })

  it("should handle optional fields", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "text",
          id: "optional",
          label: "Optional",
          required: false,
        },
      ],
    }

    const schema = toJsonSchema(form)

    expect(schema.required).toBeUndefined()
  })

  it("should include form title and description", () => {
    const form: FormIR = {
      id: "user_profile",
      title: "User Profile",
      description: "Update your profile information",
      fields: [
        {
          kind: "text",
          id: "name",
          label: "Name",
          required: true,
        },
      ],
    }

    const schema = toJsonSchema(form)

    expect(schema.title).toBe("User Profile")
    expect(schema.description).toBe("Update your profile information")
  })

  it("should handle default values", () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "text",
          id: "country",
          label: "Country",
          defaultValue: "US",
        },
        {
          kind: "number",
          id: "quantity",
          label: "Quantity",
          defaultValue: 1,
        },
      ],
    }

    const schema = toJsonSchema(form)

    expect(schema.properties?.country?.default).toBe("US")
    expect(schema.properties?.quantity?.default).toBe(1)
  })

  it("should compile multiple fields", () => {
    const form: FormIR = {
      id: "contact",
      fields: [
        { kind: "text", id: "name", label: "Name", required: true },
        { kind: "email", id: "email", label: "Email", required: true },
        { kind: "textarea", id: "message", label: "Message", maxLength: 1000 },
      ],
    }

    const schema = toJsonSchema(form)

    expect(Object.keys(schema.properties ?? {})).toHaveLength(3)
    expect(schema.required).toEqual(["name", "email"])
  })
})
