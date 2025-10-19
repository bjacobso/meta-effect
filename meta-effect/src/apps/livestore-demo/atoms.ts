/**
 * Reactive Atoms for Todo App
 *
 * Demonstrates how to create reactive Jotai atoms that automatically
 * subscribe to LiveStore queries using the livestore-atom component.
 */

import { liveStoreAtom, liveStoreAtomFamily } from '../../packages/registry/src/effect-livestore/livestore-atom'
import { todosTable, type Todo } from './schema'

// ============================================================================
// Query Atoms
// ============================================================================

/**
 * All todos atom
 * Automatically updates when todos are created, updated, or deleted
 */
export const allTodosAtom = liveStoreAtom<Todo[]>({
  query: (db) => db.select().from(todosTable).all(),
  key: 'all-todos',
})

/**
 * Active todos atom
 * Only shows incomplete todos
 */
export const activeTodosAtom = liveStoreAtom<Todo[]>({
  query: (db) =>
    db
      .select()
      .from(todosTable)
      .where((row) => row.completed.equals(false))
      .all(),
  key: 'active-todos',
})

/**
 * Completed todos atom
 * Only shows completed todos
 */
export const completedTodosAtom = liveStoreAtom<Todo[]>({
  query: (db) =>
    db
      .select()
      .from(todosTable)
      .where((row) => row.completed.equals(true))
      .all(),
  key: 'completed-todos',
})

/**
 * Todo count atom
 * Shows the total number of todos
 */
export const todoCountAtom = liveStoreAtom<number>({
  query: (db) => db.select().from(todosTable).all().length,
  key: 'todo-count',
})

// ============================================================================
// Parameterized Atom Family
// ============================================================================

/**
 * Single todo atom by ID
 * Creates individual atoms for each todo ID
 */
export const todoByIdAtom = liveStoreAtomFamily<string, Todo | undefined>(
  (id) => ({
    query: (db) =>
      db
        .select()
        .from(todosTable)
        .where((row) => row.id.equals(id))
        .get(),
    key: `todo-${id}`,
  })
)
