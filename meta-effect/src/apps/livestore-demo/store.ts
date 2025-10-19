/**
 * LiveStore Setup with Effect Integration
 *
 * Demonstrates how to initialize LiveStore and create Effect layers
 * using the vendorable effect-livestore components.
 */

import { makeLiveStore } from '@livestore/livestore'
import { webAdapter } from '@livestore/adapter-web'
import { LiveStoreService } from '../../packages/registry/src/effect-livestore/livestore-service'
import { makeEventDispatcher } from '../../packages/registry/src/effect-livestore/event-helpers'
import { setGlobalLiveStore } from '../../packages/registry/src/effect-livestore/livestore-atom'
import { schema, todoCreated, todoCompleted, todoUncompleted, todoDeleted } from './schema'

// ============================================================================
// LiveStore Initialization
// ============================================================================

/**
 * Initialize the LiveStore instance
 * In a real app, call this once at startup
 */
export async function initLiveStore() {
  const store = await makeLiveStore(schema, {
    adapter: webAdapter({
      dbName: 'todos-demo',
    }),
  })

  // Set global store for atoms
  setGlobalLiveStore(store)

  return store
}

// ============================================================================
// Effect Layer
// ============================================================================

/**
 * Create the LiveStore Effect layer
 * Provide this to Effect programs that need LiveStore access
 */
export const LiveStoreLayer = LiveStoreService.makeLayer(initLiveStore)

// ============================================================================
// Typed Event Dispatchers
// ============================================================================

/**
 * Type-safe event dispatchers
 * These are Effect programs that require LiveStoreService
 */
export const dispatch = makeEventDispatcher({
  todoCreated,
  todoCompleted,
  todoUncompleted,
  todoDeleted,
})

// ============================================================================
// Example Effect Programs
// ============================================================================

import { Effect } from 'effect'

/**
 * Create a new todo (Effect program)
 */
export const createTodo = (text: string) =>
  Effect.gen(function* () {
    const id = crypto.randomUUID()
    const createdAt = Date.now()

    yield* dispatch.todoCreated({ id, text, createdAt })

    return id
  })

/**
 * Toggle todo completion status (Effect program)
 */
export const toggleTodo = (id: string, completed: boolean) =>
  Effect.gen(function* () {
    if (completed) {
      yield* dispatch.todoUncompleted({ id })
    } else {
      const completedAt = Date.now()
      yield* dispatch.todoCompleted({ id, completedAt })
    }
  })

/**
 * Delete a todo (Effect program)
 */
export const deleteTodo = (id: string) => dispatch.todoDeleted({ id })

/**
 * Batch create multiple todos (Effect program)
 */
export const createTodos = (texts: string[]) =>
  Effect.gen(function* () {
    const effects = texts.map((text) => createTodo(text))
    yield* Effect.all(effects, { concurrency: 'unbounded' })
  })
