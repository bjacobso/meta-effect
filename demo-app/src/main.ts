/**
 * Meta Effect Registry Demo
 *
 * Interactive browser for vendorable Effect components
 */

import { Effect } from "effect"
import { loadAllComponents, groupComponentsByType } from "./registry-loader"
import {
  createTypeSection,
  createLoadingState,
  createErrorState
} from "./ui"
import "./style.css"

const app = document.querySelector<HTMLDivElement>("#app")!

// Show loading state
app.innerHTML = ""
app.appendChild(createLoadingState())

// Load and display registry
const program = Effect.gen(function* () {
  const components = yield* loadAllComponents()
  const grouped = groupComponentsByType(components)

  // Clear loading state
  app.innerHTML = `
    <header>
      <h1>Meta Effect Registry</h1>
      <p class="subtitle">Vendorable Effect components for modern web frameworks</p>
      <div class="stats">
        <span>${components.length} components</span>
        <span>${grouped.size} categories</span>
      </div>
    </header>
    <main></main>
  `

  const main = app.querySelector("main")!

  // Render components grouped by type
  for (const [type, typeComponents] of grouped) {
    main.appendChild(createTypeSection(type, typeComponents))
  }

  return components
})

Effect.runPromise(program).catch((error) => {
  app.innerHTML = ""
  app.appendChild(createErrorState(error))
})
