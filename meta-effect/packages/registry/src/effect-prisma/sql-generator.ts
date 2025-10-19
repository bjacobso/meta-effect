/**
 * Prisma Generator for Effect Schema Models
 *
 * Generates Effect Schema Model classes from Prisma schema using @effect/sql.
 * Creates branded ID types, Model.Class definitions, and NotFound error classes.
 *
 * @example
 * ```prisma
 * // schema.prisma
 * generator effectSql {
 *   provider = "node ./sql-generator.js"
 *   output   = "./src/models"
 * }
 *
 * model Person {
 *   id        Int      @id @default(autoincrement())
 *   firstName String
 *   createdAt DateTime @default(now())
 * }
 * ```
 *
 * Generates:
 * ```typescript
 * export const PersonId = Schema.Number.pipe(Schema.brand("PersonId"))
 * export class Person extends Model.Class<Person>("Person")({
 *   id: Model.Generated(PersonId),
 *   firstName: Schema.String,
 *   createdAt: Model.DateTimeInsert,
 * }) {}
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { DMMF } from "@prisma/generator-helper"
import { generatorHandler } from "@prisma/generator-helper"
import * as fs from "node:fs/promises"
import * as path from "node:path"

// ============================================================================
// Type Mapping
// ============================================================================

interface FieldMapping {
  schema: string
  imports: Set<string>
}

function mapPrismaTypeToEffectSchema(
  field: DMMF.Field,
): FieldMapping {
  const imports = new Set<string>()
  imports.add("Schema")

  let schema = ""

  // Handle field patterns
  if (field.isId && field.hasDefaultValue) {
    // @id @default(autoincrement()) or @id @default(uuid())
    schema = `Model.Generated(${field.type}Id)`
    imports.add("Model")
  } else if (field.name === "createdAt" && field.hasDefaultValue) {
    schema = "Model.DateTimeInsert"
    imports.add("Model")
  } else if (field.name === "updatedAt" && field.isUpdatedAt) {
    schema = "Model.DateTimeUpdate"
    imports.add("Model")
  } else {
    // Base type mapping
    switch (field.type) {
      case "String":
        schema = "Schema.String"
        break
      case "Int":
      case "Float":
      case "Decimal":
        schema = "Schema.Number"
        break
      case "BigInt":
        schema = "Schema.BigInt"
        break
      case "Boolean":
        schema = "Schema.Boolean"
        break
      case "DateTime":
        schema = "Model.Date"
        imports.add("Model")
        break
      case "Json":
        schema = "Schema.Unknown"
        break
      case "Bytes":
        schema = "Schema.Uint8Array"
        break
      default:
        // Assume it's a relation or enum - use branded ID
        if (field.relationName) {
          schema = `${field.type}Id`
        } else {
          // Enum
          schema = `Schema.String` // Simplified - could generate Literal
        }
    }

    // Wrap in FieldOption if optional
    if (!field.isRequired && !field.isList) {
      schema = `Model.FieldOption(${schema})`
      imports.add("Model")
    }

    // Handle default values that aren't timestamps
    if (field.hasDefaultValue && field.name !== "createdAt" && field.name !== "updatedAt" && !field.isId) {
      schema = `Model.GeneratedByApp(${schema})`
      imports.add("Model")
    }
  }

  return { schema, imports }
}

// ============================================================================
// Code Generation
// ============================================================================

function generateBrandedId(modelName: string, idField: DMMF.Field): string {
  const idType = idField.type === "String" ? "Schema.String" : "Schema.Number"

  return `export const ${modelName}Id = ${idType}.pipe(Schema.brand("${modelName}Id"))
export type ${modelName}Id = typeof ${modelName}Id.Type`
}

function generateModel(model: DMMF.Model): { code: string; imports: Set<string>; relatedModels: Set<string> } {
  const allImports = new Set<string>(["Schema", "Model"])
  const relatedModels = new Set<string>()

  // Filter out relation fields, keep only scalar fields
  const scalarFields = model.fields.filter(f => !f.relationName || f.isForeignKey)

  const fieldLines: string[] = []

  for (const field of scalarFields) {
    const mapping = mapPrismaTypeToEffectSchema(field)
    mapping.imports.forEach(imp => allImports.add(imp))

    // Track related model imports
    if (field.relationName && field.isForeignKey) {
      relatedModels.add(field.type)
    }

    fieldLines.push(`  ${field.name}: ${mapping.schema},`)
  }

  const modelCode = `export class ${model.name} extends Model.Class<${model.name}>("${model.name}")({
${fieldLines.join("\n")}
}) {}`

  return { code: modelCode, imports: allImports, relatedModels }
}

function generateNotFoundError(modelName: string): string {
  return `export class ${modelName}NotFound extends Schema.TaggedError<${modelName}NotFound>()(
  "${modelName}NotFound",
  {
    id: ${modelName}Id,
  },
) {}`
}

function generateModelFile(model: DMMF.Model, allModels: DMMF.Model[]): string {
  const idField = model.fields.find(f => f.isId)
  if (!idField) {
    throw new Error(`Model ${model.name} has no @id field`)
  }

  const { code: modelCode, imports, relatedModels } = generateModel(model)

  // Build imports section
  const importLines: string[] = []

  // Effect imports
  const effectImports = Array.from(imports).sort()
  importLines.push(`import { ${effectImports.join(", ")} } from "effect"`)
  importLines.push(`import { Model } from "@effect/sql"`)

  // Related model imports
  const sortedRelated = Array.from(relatedModels).sort()
  for (const relatedModel of sortedRelated) {
    importLines.push(`import { ${relatedModel}Id } from "./${relatedModel}.js"`)
  }

  const parts: string[] = []
  parts.push("// AUTOGENERATED FILE - DO NOT EDIT")
  parts.push("// Generated by prisma-effect-sql-generator")
  parts.push("")
  parts.push(importLines.join("\n"))
  parts.push("")
  parts.push(generateBrandedId(model.name, idField))
  parts.push("")
  parts.push(modelCode)
  parts.push("")
  parts.push(generateNotFoundError(model.name))
  parts.push("")

  return parts.join("\n")
}

// ============================================================================
// Generator Handler
// ============================================================================

generatorHandler({
  onManifest() {
    return {
      defaultOutput: "./src/models",
      prettyName: "Prisma Effect SQL Generator",
    }
  },

  async onGenerate(options) {
    const outputDir = options.generator.output?.value
    if (!outputDir) {
      throw new Error("No output directory specified")
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })

    // Generate one file per model
    for (const model of options.dmmf.datamodel.models) {
      const fileContent = generateModelFile(model, options.dmmf.datamodel.models)
      const filePath = path.join(outputDir, `${model.name}.ts`)
      await fs.writeFile(filePath, fileContent, "utf-8")
    }

    console.log(`✓ Generated ${options.dmmf.datamodel.models.length} Effect Schema Models`)
  },
})
