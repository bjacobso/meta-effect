/**
 * Entry Point for LiveStore + Effect Demo App
 *
 * Demonstrates how to initialize the app with LiveStore and render
 * the React component tree.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'jotai'
import { TodoApp } from './TodoApp'
import { initLiveStore } from './store'

// ============================================================================
// App Initialization
// ============================================================================

async function main() {
  // Initialize LiveStore
  // This sets up the event store, SQLite database, and sync engine
  await initLiveStore()

  // Render React app
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Provider>
        <TodoApp />
      </Provider>
    </React.StrictMode>
  )
}

main().catch(console.error)
