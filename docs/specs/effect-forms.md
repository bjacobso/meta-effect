# effect-forms Specification

**Status**: Planned
**Components**: See [`registry/effect-forms/`](../../registry/effect-forms/) (to be created)
**Last Updated**: 2025-10-18

## Overview

`effect-forms` is a collection of vendorable components (~260 lines total) for building type-safe, multi-target form definitions with Effect Schema. These aren't runtime form libraries - they're TypeScript schemas that compile to JSON Schema, GitHub Actions inputs, React components, and more.

Think "form definitions as data" - typed, serializable, AI-friendly schemas that generate code and validation rules.

**Core Thesis**: Forms are data structures that should be defined once and compiled to multiple targets. By using Effect Schema with AI-friendly metadata, forms become self-documenting, validatable, and compatible with modern LLM tooling (MCP, function calling, etc.).

**Components**:
- Form schema (~260 lines): form-schema, form-to-json-schema, form-to-github-inputs, form-to-react-shadcn

## Core Primitives

### 1. Form Schema (Type-Safe Form IR)

Effect Schema types for declarative form definitions:

```typescript
import { FormIR } from './lib/effect-forms/form-schema'

const releaseForm: FormIR = {
  id: "release_approval",
  title: "Release Approval",
  description: "Confirm release details before deploying to production",
  fields: [
    {
      kind: "text",
      id: "version",
      label: "Version Tag",
      placeholder: "v1.2.3",
      required: true,
      pattern: "^v\\d+\\.\\d+\\.\\d+$",
      ai: {
        intent: "semver",
        synonyms: ["release tag", "version number"],
        examples: { version: "v1.2.3", versionAlt: "v2.0.0-beta.1" },
        pii: false
      }
    },
    {
      kind: "select",
      id: "environment",
      label: "Target Environment",
      options: [
        { value: "staging", label: "Staging" },
        { value: "production", label: "Production" }
      ],
      defaultValue: "staging",
      required: true
    },
    {
      kind: "checkbox",
      id: "runMigrations",
      label: "Run database migrations",
      defaultValue: false,
      when: "environment == 'production'" // Conditional visibility
    },
    {
      kind: "textarea",
      id: "releaseNotes",
      label: "Release Notes",
      placeholder: "What changed in this release?",
      minLength: 10,
      maxLength: 1000
    }
  ]
}
```

**Field Types**:
- `FieldText` - Single-line text input with pattern validation
- `FieldEmail` - Email input with built-in validation
- `FieldTextarea` - Multi-line text input
- `FieldSelect` - Dropdown selection with options
- `FieldCheckbox` - Boolean checkbox
- `FieldDate` - Date picker
- `FieldNumber` - Numeric input with min/max

**AI Hints**:
```typescript
export const AIHints = S.Struct({
  intent: S.optional(S.String),        // "semver", "email", "person_name"
  synonyms: S.optional(S.Array(S.String)),
  examples: S.optional(S.Record({ key: S.String, value: S.String })),
  pii: S.optional(S.Boolean),
  classification: S.optional(S.String) // "person.name", "financial.account"
})
```

### 2. JSON Schema Compiler

Compile FormIR to JSON Schema Draft 7 for validation:

```typescript
import { toJsonSchema } from './lib/effect-forms/form-to-json-schema'
import Ajv from 'ajv'

const jsonSchema = toJsonSchema(releaseForm)
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "type": "object",
//   "title": "Release Approval",
//   "description": "Confirm release details before deploying to production",
//   "properties": {
//     "version": {
//       "type": "string",
//       "pattern": "^v\\\\d+\\\\.\\\\d+\\\\.\\\\d+$"
//     },
//     "environment": {
//       "type": "string",
//       "enum": ["staging", "production"],
//       "default": "staging"
//     },
//     "runMigrations": {
//       "type": "boolean",
//       "default": false
//     },
//     "releaseNotes": {
//       "type": "string",
//       "minLength": 10,
//       "maxLength": 1000
//     }
//   },
//   "required": ["version", "environment"]
// }

// Validate user input
const ajv = new Ajv()
const validate = ajv.compile(jsonSchema)

const userInput = {
  version: "v1.2.3",
  environment: "production",
  runMigrations: true,
  releaseNotes: "Fixed critical bug in auth flow"
}

const valid = validate(userInput)
if (!valid) {
  console.error(validate.errors)
}
```

### 3. GitHub Actions Inputs Compiler

Compile FormIR to GitHub Actions workflow_dispatch inputs:

```typescript
import { toGithubInputs } from './lib/effect-forms/form-to-github-inputs'
import YAML from 'yaml'

const ghInputs = toGithubInputs(releaseForm)
// {
//   version: {
//     description: "Version Tag",
//     required: true,
//     type: "string"
//   },
//   environment: {
//     description: "Target Environment",
//     required: true,
//     type: "choice",
//     options: ["staging", "production"],
//     default: "staging"
//   },
//   runMigrations: {
//     description: "Run database migrations",
//     required: false,
//     type: "boolean",
//     default: false
//   },
//   releaseNotes: {
//     description: "Release Notes",
//     required: false,
//     type: "string"
//   }
// }

const workflow = {
  name: "Release",
  on: {
    workflow_dispatch: {
      inputs: ghInputs
    }
  },
  jobs: {
    release: {
      "runs-on": "ubuntu-latest",
      steps: [
        {
          name: "Deploy",
          run: `echo "Deploying ${{ inputs.version }} to ${{ inputs.environment }}"`
        }
      ]
    }
  }
}

console.log(YAML.stringify(workflow))
```

### 4. React/Shadcn Component Generator

Generate React component source code from FormIR:

```typescript
import { toReactShadcn } from './lib/effect-forms/form-to-react-shadcn'
import fs from 'node:fs'

const componentSource = toReactShadcn(releaseForm, {
  imports: {
    Input: "@/components/ui/input",
    Select: "@/components/ui/select",
    Checkbox: "@/components/ui/checkbox",
    Textarea: "@/components/ui/textarea",
    Button: "@/components/ui/button",
    Label: "@/components/ui/label"
  },
  validation: "zod" // or "ajv" or "none"
})

// Write to file (users vendor this output)
fs.writeFileSync("src/components/ReleaseForm.tsx", componentSource)
```

**Generated Output**:
```tsx
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { z } from "zod"

const schema = z.object({
  version: z.string().regex(/^v\d+\.\d+\.\d+$/),
  environment: z.enum(["staging", "production"]),
  runMigrations: z.boolean().optional(),
  releaseNotes: z.string().min(10).max(1000).optional()
})

export type ReleaseFormData = z.infer<typeof schema>

export function ReleaseForm({ onSubmit }: { onSubmit: (data: ReleaseFormData) => void }) {
  const [values, setValues] = useState<Partial<ReleaseFormData>>({
    environment: "staging",
    runMigrations: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = schema.safeParse(values)
    if (result.success) {
      onSubmit(result.data)
    } else {
      setErrors(result.error.flatten().fieldErrors)
    }
  }

  const showRunMigrations = values.environment === "production"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="version">Version Tag</Label>
        <Input
          id="version"
          placeholder="v1.2.3"
          required
          value={values.version ?? ""}
          onChange={(e) => setValues({ ...values, version: e.target.value })}
        />
        {errors.version && <p className="text-sm text-red-500">{errors.version}</p>}
      </div>

      <div>
        <Label htmlFor="environment">Target Environment</Label>
        <Select
          value={values.environment}
          onValueChange={(v) => setValues({ ...values, environment: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="production">Production</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showRunMigrations && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="runMigrations"
            checked={values.runMigrations}
            onCheckedChange={(checked) => setValues({ ...values, runMigrations: checked })}
          />
          <Label htmlFor="runMigrations">Run database migrations</Label>
        </div>
      )}

      <div>
        <Label htmlFor="releaseNotes">Release Notes</Label>
        <Textarea
          id="releaseNotes"
          placeholder="What changed in this release?"
          value={values.releaseNotes ?? ""}
          onChange={(e) => setValues({ ...values, releaseNotes: e.target.value })}
        />
        {errors.releaseNotes && <p className="text-sm text-red-500">{errors.releaseNotes}</p>}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  )
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      FormIR Definition                       │
│                   (Type-Safe Schema)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  const form: FormIR = {                                     │
│    id: "release_approval",                                  │
│    fields: [                                                 │
│      { kind: "text", id: "version", ... },                 │
│      { kind: "select", id: "env", ... }                    │
│    ]                                                         │
│  }                                                           │
│                                                              │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴─────────┬─────────────┬──────────────┐
        │                  │             │              │
┌───────▼────────┐ ┌───────▼──────┐ ┌───▼────────┐ ┌──▼──────────┐
│  JSON Schema   │ │  GitHub      │ │  React     │ │  TypeScript │
│  Compiler      │ │  Actions     │ │  Component │ │  Types      │
└───────┬────────┘ └───────┬──────┘ └───┬────────┘ └──┬──────────┘
        │                  │             │              │
┌───────▼────────┐ ┌───────▼──────┐ ┌───▼────────┐ ┌──▼──────────┐
│ validation.    │ │ .github/     │ │ Form.tsx   │ │ types.ts    │
│ schema.json    │ │ workflows/   │ │ (vendored) │ │ (generated) │
│                │ │ release.yml  │ │            │ │             │
└────────────────┘ └──────────────┘ └────────────┘ └─────────────┘
```

## Key Design Decisions

### 1. Why FormIR as Data?

- **Serializable**: Store in DB, send over network, version control
- **Multi-Target**: One definition → many outputs
- **Validatable**: Effect Schema ensures correctness
- **Type-Safe**: Full TypeScript inference

### 2. Why AI Hints?

Forms with AI hints are compatible with:
- **MCP Servers** - Expose forms as tools with semantic metadata
- **LLM Function Calling** - Forms → function schemas
- **Auto-Fill** - AI suggests values based on intent
- **PII Detection** - Mark sensitive fields for compliance

Example MCP integration:
```typescript
// MCP server exposes form as tool
server.addTool({
  name: "submit_release",
  description: releaseForm.description,
  parameters: toJsonSchema(releaseForm),
  ai_hints: releaseForm.fields.map(f => f.ai).filter(Boolean)
})
```

### 3. Why Code Generation Over Runtime Rendering?

**Code Generation** (our approach):
- ✅ Users own the output (vendor into repo)
- ✅ Customizable (edit generated code)
- ✅ No runtime dependency
- ✅ Type-safe at compile time
- ✅ Works with any UI library (Shadcn, Chakra, etc.)

**Runtime Rendering** (alternative):
- ❌ Hidden abstractions
- ❌ Hard to customize
- ❌ Bundle bloat
- ❌ Vendor lock-in

### 4. Why Not Use React Hook Form / Formik / etc.?

`effect-forms` complements existing form libraries:
- **effect-forms**: Schema definition + code generation
- **React Hook Form / Formik**: Runtime form state management

You can generate code that uses React Hook Form:
```typescript
const componentSource = toReactShadcn(releaseForm, {
  runtime: "react-hook-form"
})
```

## Implementation Status

### ✅ Planned Components

- **form-schema.ts** (~70 lines)
  - FormIR type with branded IDs
  - Field type unions (Text, Email, Select, etc.)
  - AIHints schema
  - Conditional visibility (`when` expressions)

- **form-to-json-schema.ts** (~60 lines)
  - Compile FormIR → JSON Schema Draft 7
  - Support all field types and validation rules
  - Required fields, defaults, constraints

- **form-to-github-inputs.ts** (~50 lines)
  - Compile FormIR → workflow_dispatch inputs
  - Map field types to GHA input types
  - Handle defaults and required fields

- **form-to-react-shadcn.ts** (~80 lines)
  - Generate React component source code
  - Support Zod/Ajv validation
  - Conditional field rendering
  - Shadcn/ui component imports

### 🚧 Future Enhancements

- **form-to-svelte.ts** - Svelte component generator
- **form-to-solid.ts** - SolidJS component generator
- **form-to-html.ts** - Plain HTML form generator
- **form-to-openapi.ts** - OpenAPI schema compiler
- **form-parser.ts** - Parse concise DSL → FormIR

## Example Application Structure

```
my-project/
├── lib/
│   └── effect-forms/              # Vendored components
│       ├── form-schema.ts         # FormIR types (70 lines)
│       ├── form-to-json-schema.ts # JSON Schema compiler (60 lines)
│       ├── form-to-github-inputs.ts # GHA compiler (50 lines)
│       └── form-to-react-shadcn.ts  # React generator (80 lines)
├── forms/
│   ├── release-form.ts            # FormIR definition
│   ├── incident-form.ts
│   └── onboarding-form.ts
├── components/                    # Generated components
│   ├── ReleaseForm.tsx            # Generated from release-form.ts
│   ├── IncidentForm.tsx
│   └── OnboardingForm.tsx
└── scripts/
    └── generate-forms.ts          # Build script to regenerate forms
```

## Usage Examples

### Example 1: Incident Report Form

```typescript
import { FormIR } from './lib/effect-forms/form-schema'

const incidentForm: FormIR = {
  id: "incident_report",
  title: "Incident Report",
  fields: [
    {
      kind: "text",
      id: "title",
      label: "Incident Title",
      required: true,
      maxLength: 100
    },
    {
      kind: "select",
      id: "severity",
      label: "Severity",
      options: [
        { value: "SEV-1", label: "SEV-1 (Critical - Customer Impact)" },
        { value: "SEV-2", label: "SEV-2 (High - Degraded Service)" },
        { value: "SEV-3", label: "SEV-3 (Medium - Minor Impact)" },
        { value: "SEV-4", label: "SEV-4 (Low - No Impact)" }
      ],
      required: true
    },
    {
      kind: "checkbox",
      id: "customerImpact",
      label: "Customer impact observed?",
      when: "severity == 'SEV-1' || severity == 'SEV-2'"
    },
    {
      kind: "textarea",
      id: "description",
      label: "Description",
      placeholder: "What happened? What's the impact?",
      required: true,
      minLength: 50
    },
    {
      kind: "date",
      id: "detectedAt",
      label: "Detection Time",
      required: true
    }
  ]
}
```

### Example 2: Employee Onboarding Form

```typescript
const onboardingForm: FormIR = {
  id: "employee_onboarding",
  title: "New Employee Onboarding",
  fields: [
    {
      kind: "text",
      id: "fullName",
      label: "Full Name",
      required: true,
      ai: {
        intent: "person_name",
        pii: true,
        classification: "person.name"
      }
    },
    {
      kind: "email",
      id: "workEmail",
      label: "Work Email",
      required: true,
      ai: {
        pii: true,
        classification: "person.email"
      }
    },
    {
      kind: "select",
      id: "department",
      label: "Department",
      options: [
        { value: "engineering", label: "Engineering" },
        { value: "product", label: "Product" },
        { value: "design", label: "Design" },
        { value: "sales", label: "Sales" }
      ],
      required: true
    },
    {
      kind: "select",
      id: "role",
      label: "Role",
      options: [], // Populated dynamically based on department
      required: true,
      when: "department != null"
    },
    {
      kind: "date",
      id: "startDate",
      label: "Start Date",
      required: true
    },
    {
      kind: "checkbox",
      id: "needsLaptop",
      label: "Request laptop setup",
      defaultValue: true
    }
  ]
}
```

### Example 3: Multi-Target Compilation

```typescript
import { toJsonSchema } from './lib/effect-forms/form-to-json-schema'
import { toGithubInputs } from './lib/effect-forms/form-to-github-inputs'
import { toReactShadcn } from './lib/effect-forms/form-to-react-shadcn'
import fs from 'node:fs'
import YAML from 'yaml'

// 1. Generate JSON Schema for validation
const jsonSchema = toJsonSchema(incidentForm)
fs.writeFileSync(
  'schemas/incident-report.schema.json',
  JSON.stringify(jsonSchema, null, 2)
)

// 2. Generate GitHub Actions workflow
const ghInputs = toGithubInputs(incidentForm)
const workflow = {
  name: "Create Incident",
  on: { workflow_dispatch: { inputs: ghInputs } },
  jobs: {
    create_incident: {
      "runs-on": "ubuntu-latest",
      steps: [
        {
          name: "Create PagerDuty Incident",
          run: `pagerduty create --title "${{ inputs.title }}" --severity "${{ inputs.severity }}"`
        }
      ]
    }
  }
}
fs.writeFileSync('.github/workflows/incident.yml', YAML.stringify(workflow))

// 3. Generate React component
const reactComponent = toReactShadcn(incidentForm)
fs.writeFileSync('src/components/IncidentForm.tsx', reactComponent)

console.log('✓ Generated 3 artifacts from single FormIR')
```

## Customization Patterns

### Custom Field Type

Add a custom field type by extending the schema:

```typescript
// In your vendored form-schema.ts
import { Schema as S } from '@effect/schema/Schema'

export const FieldColorPicker = S.extend(
  FieldBase,
  S.Struct({
    kind: S.Literal("color"),
    defaultValue: S.optional(S.String),
    format: S.optional(S.Literal("hex", "rgb", "hsl"))
  })
)

// Add to Field union
export const Field = S.Union(
  FieldText,
  FieldEmail,
  FieldColorPicker, // NEW
  // ...
)
```

Then update compilers to handle the new type:

```typescript
// In form-to-json-schema.ts
const fieldToSchema = (field: Field): JSONSchema7 => {
  switch (field.kind) {
    case "color":
      return { type: "string", format: "color" }
    // ...
  }
}
```

### Custom Validation Rules

Add domain-specific validation:

```typescript
const customForm: FormIR = {
  id: "payment",
  fields: [
    {
      kind: "text",
      id: "creditCard",
      label: "Credit Card",
      pattern: "^\\d{4}-\\d{4}-\\d{4}-\\d{4}$",
      ai: {
        intent: "credit_card",
        pii: true,
        classification: "financial.payment_card"
      },
      // Custom validation in generated code
      customValidation: "luhnCheck" // Reference to function
    }
  ]
}
```

### MCP Server Integration

Expose forms as MCP tools:

```typescript
import { createMCPServer } from '@modelcontextprotocol/sdk'
import { toJsonSchema } from './lib/effect-forms/form-to-json-schema'

const server = createMCPServer({
  name: "form-server",
  version: "1.0.0"
})

server.addTool({
  name: "submit_incident",
  description: incidentForm.title,
  inputSchema: toJsonSchema(incidentForm),
  handler: async (input) => {
    // Process incident submission
    const incident = await createIncident(input)
    return { incidentId: incident.id }
  }
})
```

## Testing Strategy

### Unit Tests (Schema Validation)

```typescript
import { describe, it, expect } from 'vitest'
import { FormIR } from './form-schema'
import { Schema as S } from '@effect/schema/Schema'

describe('form-schema', () => {
  it('validates well-formed FormIR', () => {
    const form: FormIR = {
      id: "test_form",
      fields: [
        { kind: "text", id: "name", label: "Name", required: true }
      ]
    }

    const result = S.decodeUnknownSync(FormIR)(form)
    expect(result.id).toBe("test_form")
  })

  it('rejects invalid field types', () => {
    const invalid = {
      id: "test",
      fields: [
        { kind: "invalid", id: "field1" } // Should fail
      ]
    }

    expect(() => S.decodeUnknownSync(FormIR)(invalid)).toThrow()
  })
})
```

### Compiler Tests

```typescript
import { describe, it, expect } from 'vitest'
import { toJsonSchema } from './form-to-json-schema'

describe('form-to-json-schema', () => {
  it('compiles text field correctly', () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "text",
          id: "email",
          label: "Email",
          pattern: "^[^@]+@[^@]+$",
          required: true
        }
      ]
    }

    const schema = toJsonSchema(form)
    expect(schema.properties.email).toMatchObject({
      type: "string",
      pattern: "^[^@]+@[^@]+$"
    })
    expect(schema.required).toContain("email")
  })

  it('compiles select field with options', () => {
    const form: FormIR = {
      id: "test",
      fields: [
        {
          kind: "select",
          id: "size",
          label: "Size",
          options: [
            { value: "S", label: "Small" },
            { value: "M", label: "Medium" }
          ]
        }
      ]
    }

    const schema = toJsonSchema(form)
    expect(schema.properties.size).toMatchObject({
      type: "string",
      enum: ["S", "M"]
    })
  })
})
```

### Integration Tests (Generated Code)

```typescript
import { describe, it, expect } from 'vitest'
import { toReactShadcn } from './form-to-react-shadcn'
import { transform } from '@babel/core'

describe('form-to-react-shadcn', () => {
  it('generates valid TypeScript', () => {
    const form: FormIR = {
      id: "test",
      fields: [
        { kind: "text", id: "name", label: "Name", required: true }
      ]
    }

    const code = toReactShadcn(form)

    // Verify it's valid TypeScript
    const result = transform(code, {
      presets: ['@babel/preset-typescript', '@babel/preset-react']
    })

    expect(result.code).toBeTruthy()
  })
})
```

## Performance Characteristics

- **Schema Validation**: ~1ms per form (Effect Schema)
- **JSON Schema Compilation**: ~5ms per form
- **React Code Generation**: ~10-20ms per form
- **Bundle Size**: ~2KB per vendored component (gzipped)

## Open Questions

1. **Conditional Logic**: Should we support complex `when` expressions (CEL/JEXL) or simple equality?
2. **Field Dependencies**: How to handle cascading selects (department → role)?
3. **File Uploads**: Should we add `FieldFile` type or leave to custom extensions?
4. **Multi-Step Forms**: Separate component or compose multiple FormIR instances?
5. **Localization**: Include i18n support in FormIR or leave to consumers?

## Related Documents

- [effect-collect Spec](./effect-collect.md) - Uses FormIR for human-in-the-loop workflows
- [effect-compilers Spec](./effect-compilers.md) - Multi-target compilation pattern
- [Effect Schema Docs](https://effect.website/docs/schema) - Schema validation docs
- [JSON Schema](https://json-schema.org/) - JSON Schema specification
- [MCP SDK](https://modelcontextprotocol.io/) - Model Context Protocol

## Contributing

This is a living document. As users customize `effect-forms`, we update this spec with:
- Common field type extensions
- Integration examples (Zod, Yup, Joi interop)
- UI library adapters (Chakra, Material UI, etc.)
- Community feedback

See [registry README](../../registry/README.md) for vendoring instructions.
