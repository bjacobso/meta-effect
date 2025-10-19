#!/usr/bin/env tsx
/**
 * Registry Generator
 *
 * Auto-generates registry.json from component source files using import.meta.glob
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-registry.ts
 *   pnpm exec tsx scripts/generate-registry.ts --dry-run
 */

import { writeFileSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'

// Recursively find all TypeScript files
function findTsFiles(dir: string): string[] {
  const files: string[] = []
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(fullPath)
    }
  }

  return files
}

// Types
interface ComponentMetadata {
  title: string
  description: string
  hasExample: boolean
  hasCopyFooter: boolean
}

interface Component {
  name: string
  type: string
  description: string
  files: string[]
  dependencies: string[]
  tags: string[]
}

interface Preset {
  name: string
  description: string
  components: string[]
}

interface Registry {
  $schema: string
  components: Component[]
  presets: Preset[]
}

// === Pure Parsing Functions ===

function extractJSDoc(content: string): string | null {
  const match = content.match(/\/\*\*\s*([\s\S]*?)\*\//)
  return match ? match[1] : null
}

function parseJSDoc(jsdoc: string): ComponentMetadata | null {
  const lines = jsdoc
    .split('\n')
    .map(l => l.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean)

  if (lines.length === 0) return null

  const title = lines[0]
  const exampleIdx = lines.findIndex(l => l.startsWith('@example'))
  const hasExample = exampleIdx !== -1

  const descriptionLines = lines.slice(1, exampleIdx !== -1 ? exampleIdx : undefined)
    .filter(l => !l.startsWith('@'))

  const description = descriptionLines.join(' ').trim()
  const hasCopyFooter = jsdoc.includes('Copy this file into your project')

  if (!title || !description) return null

  return {
    title,
    description,
    hasExample,
    hasCopyFooter
  }
}

function extractImports(content: string): string[] {
  const importRegex = /import\s+(?:{\s*[^}]*\s*}|\*\s+as\s+\w+|[\w]+)\s+from\s+["']([^"']+)["']/g
  const imports: string[] = []
  let match: RegExpExecArray | null

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  return imports
}

function filterExternalDeps(imports: string[]): string[] {
  return Array.from(
    new Set(
      imports
        .filter(pkg => !pkg.startsWith('.') && !pkg.startsWith('~'))
        .sort()
    )
  )
}

function inferTags(
  componentType: string,
  filename: string,
  description: string
): string[] {
  const tags = new Set<string>()

  // Always add component type as base tag
  const typeTag = componentType.replace('effect-', '')
  tags.add(typeTag)

  // Keyword-based inference
  const text = `${filename} ${description}`.toLowerCase()

  const tagMap: Record<string, string[]> = {
    'api': ['api', 'http', 'endpoint'],
    'schema': ['schema', 'validation'],
    'vite': ['vite', 'plugin'],
    'remix': ['remix', 'loader', 'action'],
    'atoms': ['atom', 'jotai', 'reactive'],
    'ci': ['ci', 'pipeline', 'release'],
    'dag': ['dag', 'workflow', 'graph'],
    'shell': ['shell', 'command', 'cli'],
    'types': ['types', 'schema'],
    'service': ['service'],
    'database': ['database', 'prisma', 'db'],
    'transactions': ['transaction'],
    'livestore': ['livestore', 'event-sourcing'],
    'events': ['event'],
    'routing': ['route', 'url'],
    'caching': ['cache'],
    'forms': ['form'],
    'error-handling': ['error'],
    'builder': ['builder'],
    'config': ['config'],
    'validation': ['validation'],
    'dsl': ['dsl']
  }

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      tags.add(tag)
    }
  }

  return Array.from(tags).sort()
}

function extractComponentType(filepath: string): string | null {
  const match = filepath.match(/src\/(effect-[^/]+)\//)
  return match ? match[1] : null
}

function filenameToComponentName(filename: string): string {
  return filename.replace(/\.ts$/, '')
}

// === Component Generation ===

function processSourceFile(path: string, content: string): Component | null {
  // Skip test files
  if (path.endsWith('.test.ts')) return null

  // Extract component type from path
  const componentType = extractComponentType(path)
  if (!componentType) {
    console.warn(`Could not determine component type from path: ${path}`)
    return null
  }

  // Extract filename
  const filename = path.split('/').pop()!
  const componentName = filenameToComponentName(filename)

  // Extract and parse JSDoc
  const jsdoc = extractJSDoc(content)
  if (!jsdoc) {
    console.warn(`No JSDoc comment found in ${path}`)
    return null
  }

  const metadata = parseJSDoc(jsdoc)
  if (!metadata) {
    console.warn(`Could not parse JSDoc in ${path}`)
    return null
  }

  // Validate metadata
  if (!metadata.hasExample) {
    console.warn(`Missing @example in ${path}`)
  }
  if (!metadata.hasCopyFooter) {
    console.warn(`Missing copy footer in ${path}`)
  }

  // Extract dependencies from imports
  const imports = extractImports(content)
  const dependencies = filterExternalDeps(imports)

  if (dependencies.length === 0) {
    console.warn(`No external dependencies found in ${path}`)
  }

  // Infer tags
  const tags = inferTags(componentType, componentName, metadata.description)

  // Build relative file path
  const relativeFile = path.match(/src\/(.+)$/)?.[1]
  if (!relativeFile) {
    console.warn(`Could not extract relative path from ${path}`)
    return null
  }

  return {
    name: componentName,
    type: componentType,
    description: metadata.description,
    files: [relativeFile],
    dependencies,
    tags
  }
}

// === Preset Generation ===

function groupByType(components: Component[]): Record<string, Component[]> {
  const groups: Record<string, Component[]> = {}

  for (const component of components) {
    if (!groups[component.type]) {
      groups[component.type] = []
    }
    groups[component.type].push(component)
  }

  return groups
}

function generatePresets(components: Component[]): Preset[] {
  const groups = groupByType(components)
  const presets: Preset[] = []

  // Generate {type}-full and {type}-minimal presets for each type
  for (const [type, typeComponents] of Object.entries(groups)) {
    const componentNames = typeComponents.map(c => c.name)
    const typeName = type.replace('effect-', '')

    // Full preset (all components)
    if (componentNames.length > 0) {
      presets.push({
        name: `${typeName}-full`,
        description: `Complete ${type} setup with all components`,
        components: componentNames
      })
    }

    // Minimal preset (first 1-2 core components)
    const coreComponents = typeComponents
      .filter(c =>
        !c.name.includes('transaction') &&
        !c.name.includes('advanced') &&
        !c.name.includes('helper')
      )
      .slice(0, 2)

    if (coreComponents.length > 0 && coreComponents.length < componentNames.length) {
      presets.push({
        name: `${typeName}-minimal`,
        description: `Minimal ${type} with basic ${coreComponents.length === 1 ? 'wrapper' : 'helpers'}`,
        components: coreComponents.map(c => c.name)
      })
    }
  }

  // Special presets for effect-ci (release vs dag)
  const ciComponents = groups['effect-ci']
  if (ciComponents) {
    const releaseComponents = ciComponents
      .filter(c => !c.tags.includes('dag'))
      .map(c => c.name)

    const dagComponents = ciComponents
      .filter(c => c.tags.includes('dag'))
      .map(c => c.name)

    if (releaseComponents.length > 0) {
      presets.push({
        name: 'ci-release',
        description: 'Release automation components only',
        components: releaseComponents
      })
    }

    if (dagComponents.length > 0) {
      presets.push({
        name: 'ci-dag',
        description: 'DAG workflow definition and validation components',
        components: dagComponents
      })
    }
  }

  // Sort presets by name
  return presets.sort((a, b) => a.name.localeCompare(b.name))
}

// === Main ===

function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('Scanning components...')

  // Get paths
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const srcDir = join(__dirname, '..', 'src')
  const registryPath = join(__dirname, '..', 'registry.json')

  // Find all TypeScript source files
  const files = findTsFiles(srcDir)

  // Process all source files
  const components = files
    .map(filePath => {
      const content = readFileSync(filePath, 'utf-8')
      const relativePath = relative(dirname(srcDir), filePath)
      return processSourceFile(relativePath, content)
    })
    .filter((c): c is Component => c !== null)
    .sort((a, b) => {
      // Sort by type first, then by name
      const typeCompare = a.type.localeCompare(b.type)
      return typeCompare !== 0 ? typeCompare : a.name.localeCompare(b.name)
    })

  console.log(`Found ${components.length} components`)

  // Generate presets
  const presets = generatePresets(components)

  // Build registry
  const registry: Registry = {
    $schema: './schema.json',
    components,
    presets
  }

  // Format as JSON
  const json = JSON.stringify(registry, null, 2) + '\n'

  if (dryRun) {
    console.log('\n=== Generated registry.json (dry-run) ===')
    console.log(json)
    console.log(`\n✓ Would write ${components.length} components and ${presets.length} presets to ${registryPath}`)
  } else {
    writeFileSync(registryPath, json)
    console.log(`✓ Generated registry.json with ${components.length} components and ${presets.length} presets`)
  }
}

main()
