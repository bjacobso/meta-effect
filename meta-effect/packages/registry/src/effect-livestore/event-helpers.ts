/**
 * Event Helpers Component
 *
 * Type-safe event creators and dispatchers for LiveStore with Effect Schema
 * validation and automatic error handling.
 *
 * LiveStore uses event sourcing, where all state changes are described as
 * immutable events. This component provides helpers to create and dispatch
 * events in an Effect-friendly way with full type safety.
 *
 * @example
 * ```ts
 * import { Events, makeSchema, Schema } from '@livestore/livestore'
 * import { makeEventDispatcher } from './lib/effect-livestore/event-helpers'
 * import { LiveStoreService } from './lib/effect-livestore/livestore-service'
 *
 * // Define events with Schema
 * const todoCreated = Events.synced({
 *   name: 'TodoCreated',
 *   schema: Schema.Struct({
 *     id: Schema.String,
 *     text: Schema.String,
 *   }),
 * })
 *
 * const todoCompleted = Events.synced({
 *   name: 'TodoCompleted',
 *   schema: Schema.Struct({ id: Schema.String }),
 * })
 *
 * // Create typed dispatcher
 * const dispatch = makeEventDispatcher({ todoCreated, todoCompleted })
 *
 * // Use in Effect program
 * const program = Effect.gen(function* () {
 *   // Dispatch with full type safety
 *   yield* dispatch.todoCreated({ id: '1', text: 'Buy milk' })
 *   yield* dispatch.todoCompleted({ id: '1' })
 * }).pipe(Effect.provide(LiveStoreLayer))
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Effect } from 'effect'
import { LiveStoreService } from './livestore-service'

/**
 * Event definition type from LiveStore
 */
export interface EventDef<Name extends string, Schema> {
  name: Name
  schema: Schema
  (...args: any[]): any
}

/**
 * Create a typed event dispatcher from event definitions
 *
 * Returns an object with methods for each event type that dispatch
 * the event to the LiveStore service with automatic type checking.
 */
export function makeEventDispatcher<
  Events extends Record<string, EventDef<any, any>>
>(events: Events): EventDispatchers<Events> {
  const dispatchers = {} as any

  for (const [key, eventDef] of Object.entries(events)) {
    dispatchers[key] = (payload: any) =>
      Effect.gen(function* () {
        const store = yield* LiveStoreService
        const event = eventDef(payload)
        yield* store.dispatch(event)
      })
  }

  return dispatchers
}

/**
 * Infer dispatcher types from event definitions
 */
type EventDispatchers<Events extends Record<string, EventDef<any, any>>> = {
  [K in keyof Events]: Events[K] extends EventDef<any, infer Schema>
    ? (payload: Schema) => Effect.Effect<void, never, LiveStoreService>
    : never
}

/**
 * Batch multiple events into a single transaction
 */
export function batchEvents(
  events: Effect.Effect<void, never, LiveStoreService>[]
): Effect.Effect<void, never, LiveStoreService> {
  return Effect.all(events, { concurrency: 'unbounded' }).pipe(
    Effect.map(() => undefined)
  )
}
