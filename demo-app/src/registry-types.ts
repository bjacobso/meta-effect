/**
 * Registry Types
 *
 * Type definitions matching the registry.json structure
 */

export interface RegistryComponent {
  name: string
  type: string
  description: string
  files: string[]
  dependencies: string[]
  tags: string[]
}

export interface RegistryPreset {
  name: string
  description: string
  components: string[]
}

export interface Registry {
  components: RegistryComponent[]
  presets: RegistryPreset[]
}

export interface ComponentWithCode extends RegistryComponent {
  code: string
}
