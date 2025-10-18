/**
 * HTTP API Definition Component
 *
 * Defines a type-safe HttpApi with Effect Schema validation.
 * This is the core primitive for defining your API surface.
 *
 * @example
 * ```ts
 * import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
 * import { Schema } from "effect"
 *
 * export class UserApi extends HttpApiGroup.make("users")
 *   .add(HttpApiEndpoint.get("list", "/users")
 *     .addSuccess(Schema.Array(User)))
 *   .add(HttpApiEndpoint.get("getById", "/users/:id")
 *     .addSuccess(User)
 *     .setPath(Schema.Struct({ id: Schema.NumberFromString })))
 * {}
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

// Example: Todos API
export const TodoId = Schema.Number.pipe(Schema.brand("TodoId"))
export type TodoId = typeof TodoId.Type

export const TodoIdFromString = Schema.NumberFromString.pipe(
  Schema.compose(TodoId)
)

export class Todo extends Schema.Class<Todo>("Todo")({
  id: TodoId,
  text: Schema.NonEmptyTrimmedString,
  done: Schema.Boolean
}) {}

export class TodoNotFound extends Schema.TaggedError<TodoNotFound>()("TodoNotFound", {
  id: Schema.Number
}) {}

export class TodosApiGroup extends HttpApiGroup.make("todos")
  .add(HttpApiEndpoint.get("getAllTodos", "/todos").addSuccess(Schema.Array(Todo)))
  .add(
    HttpApiEndpoint.get("getTodoById", "/todos/:id")
      .addSuccess(Todo)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: TodoIdFromString }))
  )
  .add(
    HttpApiEndpoint.post("createTodo", "/todos")
      .addSuccess(Todo)
      .setPayload(Schema.Struct({ text: Schema.NonEmptyTrimmedString }))
  )
  .add(
    HttpApiEndpoint.patch("completeTodo", "/todos/:id")
      .addSuccess(Todo)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: TodoIdFromString }))
  )
  .add(
    HttpApiEndpoint.del("removeTodo", "/todos/:id")
      .addSuccess(Schema.Void)
      .addError(TodoNotFound, { status: 404 })
      .setPath(Schema.Struct({ id: TodoIdFromString }))
  )
{}

export class TodosApi extends HttpApi.make("api").add(TodosApiGroup) {}
