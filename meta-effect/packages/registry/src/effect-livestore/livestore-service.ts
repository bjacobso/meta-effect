/**
 * LiveStore Service Component
 *
 * Effect Service wrapper around LiveStore instance providing type-safe
 * event dispatch, queries, and subscriptions as Effects and Streams.
 *
 * This component demonstrates the Service pattern for managing LiveStore
 * lifecycle and providing a functional API for event sourcing operations.
 *
 * @example
 * ```ts
 * import { LiveStoreService } from './lib/effect-livestore/livestore-service'
 * import { makeLiveStore } from '@livestore/livestore'
 * import { schema } from './store/schema'
 *
 * // Create layer from schema
 * const LiveStoreLayer = LiveStoreService.makeLayer(() =>
 *   makeLiveStore(schema, { adapter: webAdapter })
 * )
 *
 * // Use in Effect program
 * const program = Effect.gen(function* () {
 *   const store = yield* LiveStoreService
 *
 *   // Dispatch events as Effects
 *   yield* store.dispatch(todoCreated({ id: '1', text: 'Buy milk' }))
 *
 *   // Query state as Effects
 *   const todos = yield* store.query((db) => db.select().from(todosTable))
 *
 *   // Subscribe to queries as Streams
 *   const todos$ = store.subscribe((db) => db.select().from(todosTable))
 *
 *   return todos
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Context, Effect, Layer, Stream } from 'effect'

/**
 * LiveStore instance interface
 * Matches the LiveStore API from @livestore/livestore
 */
export interface LiveStore {
  dispatch(event: any): Promise<void>
  query<T>(queryFn: (db: any) => T): T
  subscribe<T>(queryFn: (db: any) => T, callback: (data: T) => void): () => void
}

/**
 * LiveStore service tag providing Effect-wrapped operations
 */
export class LiveStoreService extends Context.Tag('LiveStore')<
  LiveStoreService,
  {
    readonly dispatch: (event: any) => Effect.Effect<void>
    readonly query: <T>(queryFn: (db: any) => T) => Effect.Effect<T>
    readonly subscribe: <T>(queryFn: (db: any) => T) => Stream.Stream<T>
    readonly raw: LiveStore
  }
>() {
  /**
   * Create a Layer from a LiveStore initialization function
   */
  static makeLayer(
    init: () => Promise<LiveStore>
  ): Layer.Layer<LiveStoreService> {
    return Layer.effect(
      this,
      Effect.gen(function* () {
        const store = yield* Effect.promise(init)

        return {
          // Dispatch events as Effects
          dispatch: (event: any) =>
            Effect.promise(() => store.dispatch(event)),

          // Query state as Effects
          query: <T>(queryFn: (db: any) => T) =>
            Effect.sync(() => store.query(queryFn)),

          // Subscribe to queries as Streams
          subscribe: <T>(queryFn: (db: any) => T) =>
            Stream.async<T>((emit) => {
              const unsub = store.subscribe(queryFn, (data) => {
                emit.single(data)
              })
              return Effect.sync(() => unsub())
            }),

          // Access raw LiveStore for advanced use cases
          raw: store,
        }
      })
    )
  }
}
