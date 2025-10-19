/**
 * LiveStore Schema Definition
 *
 * Defines the event-sourced data model for a todo list application.
 * Shows how to use Effect Schema with LiveStore's event sourcing pattern.
 */

import { Events, makeSchema, Schema, State } from '@livestore/livestore'

// ============================================================================
// Events - Describe all possible state changes
// ============================================================================

export const todoCreated = Events.synced({
  name: 'TodoCreated',
  schema: Schema.Struct({
    id: Schema.String,
    text: Schema.String,
    createdAt: Schema.Number,
  }),
})

export const todoCompleted = Events.synced({
  name: 'TodoCompleted',
  schema: Schema.Struct({
    id: Schema.String,
    completedAt: Schema.Number,
  }),
})

export const todoUncompleted = Events.synced({
  name: 'TodoUncompleted',
  schema: Schema.Struct({
    id: Schema.String,
  }),
})

export const todoDeleted = Events.synced({
  name: 'TodoDeleted',
  schema: Schema.Struct({
    id: Schema.String,
  }),
})

// ============================================================================
// State - SQLite table definition
// ============================================================================

export const todosTable = State.SQLite.table({
  name: 'todos',
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    text: State.SQLite.text(),
    completed: State.SQLite.boolean({ default: false }),
    createdAt: State.SQLite.integer(),
    completedAt: State.SQLite.integer({ nullable: true }),
  },
})

// ============================================================================
// Materializers - Transform events into state changes
// ============================================================================

export const materializers = State.SQLite.materializers({
  todoCreated: ({ id, text, createdAt }) =>
    todosTable.insert({ id, text, createdAt, completed: false }),

  todoCompleted: ({ id, completedAt }) =>
    todosTable
      .update({ completed: true, completedAt })
      .where((row) => row.id.equals(id)),

  todoUncompleted: ({ id }) =>
    todosTable
      .update({ completed: false, completedAt: null })
      .where((row) => row.id.equals(id)),

  todoDeleted: ({ id }) =>
    todosTable.delete().where((row) => row.id.equals(id)),
})

// ============================================================================
// Schema - Combine events and state
// ============================================================================

export const schema = makeSchema({
  events: {
    todoCreated,
    todoCompleted,
    todoUncompleted,
    todoDeleted,
  },
  state: State.SQLite.makeState({
    tables: { todos: todosTable },
    materializers,
  }),
})

export type Todo = {
  id: string
  text: string
  completed: boolean
  createdAt: number
  completedAt: number | null
}
