/**
 * UI Components
 *
 * Vanilla TypeScript UI for browsing registry components
 */

import Prism from "prismjs"
import "prismjs/themes/prism-tomorrow.css"
import "prismjs/components/prism-typescript"
import type { ComponentWithCode } from "./registry-types"

export const createComponentCard = (component: ComponentWithCode): HTMLElement => {
  const card = document.createElement("div")
  card.className = "component-card"
  card.innerHTML = `
    <div class="component-header">
      <h3>${component.name}</h3>
      <div class="component-meta">
        <span class="component-type">${component.type}</span>
        <span class="component-files">${component.files.length} file(s)</span>
      </div>
    </div>
    <p class="component-description">${component.description}</p>
    <div class="component-tags">
      ${component.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
    </div>
    <div class="component-deps">
      <strong>Dependencies:</strong> ${component.dependencies.join(", ")}
    </div>
  `

  // Add click handler to show code
  card.addEventListener("click", () => showComponentCode(component))

  return card
}

export const createTypeSection = (type: string, components: ComponentWithCode[]): HTMLElement => {
  const section = document.createElement("section")
  section.className = "type-section"
  section.innerHTML = `
    <h2>${type}</h2>
    <div class="components-grid"></div>
  `

  const grid = section.querySelector(".components-grid")!
  components.forEach(component => {
    grid.appendChild(createComponentCard(component))
  })

  return section
}

export const showComponentCode = (component: ComponentWithCode): void => {
  const modal = document.createElement("div")
  modal.className = "code-modal"
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${component.name}</h2>
        <button class="close-button">&times;</button>
      </div>
      <div class="code-container"></div>
    </div>
  `

  const codeContainer = modal.querySelector(".code-container")!

  // Use Prism for syntax highlighting
  const highlighted = Prism.highlight(
    component.code,
    Prism.languages.typescript,
    'typescript'
  )

  const pre = document.createElement("pre")
  const code = document.createElement("code")
  code.className = "language-typescript"
  code.innerHTML = highlighted
  pre.appendChild(code)

  codeContainer.appendChild(pre)

  // Close button handler
  modal.querySelector(".close-button")!.addEventListener("click", () => {
    modal.remove()
  })

  // Click outside to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })

  document.body.appendChild(modal)
}

export const createLoadingState = (): HTMLElement => {
  const loading = document.createElement("div")
  loading.className = "loading"
  loading.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading registry components...</p>
  `
  return loading
}

export const createErrorState = (error: Error): HTMLElement => {
  const errorDiv = document.createElement("div")
  errorDiv.className = "error"
  errorDiv.innerHTML = `
    <h2>Error Loading Registry</h2>
    <p>${error.message}</p>
  `
  return errorDiv
}
