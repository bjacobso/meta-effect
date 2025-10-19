/**
 * Todo App React Component
 *
 * Demonstrates how to build a reactive UI with LiveStore + Effect integration.
 * Uses Jotai atoms for reactivity and Effect programs for business logic.
 */

import React, { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Effect } from 'effect'
import { allTodosAtom, activeTodosAtom, completedTodosAtom, todoCountAtom } from './atoms'
import { createTodo, toggleTodo, deleteTodo, LiveStoreLayer } from './store'
import type { Todo } from './schema'

// ============================================================================
// TodoApp Component
// ============================================================================

export function TodoApp() {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [newTodoText, setNewTodoText] = useState('')

  // Reactive atoms - automatically update when LiveStore changes
  const allTodos = useAtomValue(allTodosAtom) ?? []
  const activeTodos = useAtomValue(activeTodosAtom) ?? []
  const completedTodos = useAtomValue(completedTodosAtom) ?? []
  const todoCount = useAtomValue(todoCountAtom) ?? 0

  // Select the right todos based on filter
  const visibleTodos = filter === 'all' ? allTodos : filter === 'active' ? activeTodos : completedTodos

  // ============================================================================
  // Event Handlers (run Effect programs)
  // ============================================================================

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoText.trim()) return

    // Run Effect program with LiveStore layer
    const program = createTodo(newTodoText.trim())
    await Effect.runPromise(program.pipe(Effect.provide(LiveStoreLayer)))

    setNewTodoText('')
  }

  const handleToggleTodo = async (todo: Todo) => {
    const program = toggleTodo(todo.id, todo.completed)
    await Effect.runPromise(program.pipe(Effect.provide(LiveStoreLayer)))
  }

  const handleDeleteTodo = async (id: string) => {
    const program = deleteTodo(id)
    await Effect.runPromise(program.pipe(Effect.provide(LiveStoreLayer)))
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Todo App with LiveStore + Effect</h1>

      {/* Add Todo Form */}
      <form onSubmit={handleAddTodo} style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="What needs to be done?"
          style={{ padding: 10, width: '70%', marginRight: 10 }}
        />
        <button type="submit" style={{ padding: 10 }}>
          Add
        </button>
      </form>

      {/* Filters */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setFilter('all')} disabled={filter === 'all'}>
          All ({allTodos.length})
        </button>
        <button onClick={() => setFilter('active')} disabled={filter === 'active'} style={{ marginLeft: 10 }}>
          Active ({activeTodos.length})
        </button>
        <button onClick={() => setFilter('completed')} disabled={filter === 'completed'} style={{ marginLeft: 10 }}>
          Completed ({completedTodos.length})
        </button>
      </div>

      {/* Todo List */}
      <div>
        {visibleTodos.length === 0 ? (
          <p style={{ color: '#666' }}>No todos yet. Add one above!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {visibleTodos.map((todo) => (
              <li
                key={todo.id}
                style={{
                  padding: 10,
                  marginBottom: 10,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <label style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(todo)}
                    style={{ marginRight: 10 }}
                  />
                  <span
                    style={{
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      color: todo.completed ? '#999' : '#000',
                    }}
                  >
                    {todo.text}
                  </span>
                </label>
                <button onClick={() => handleDeleteTodo(todo.id)} style={{ padding: '5px 10px', color: 'red' }}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stats */}
      <div style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
        <p style={{ margin: 0 }}>
          Total: {todoCount} | Active: {activeTodos.length} | Completed: {completedTodos.length}
        </p>
      </div>
    </div>
  )
}
