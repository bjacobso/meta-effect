/**
 * Server Entry Point
 *
 * Effect-based HTTP server using @effect/platform-node.
 * Mounts the EmployeesApi and provides repository implementation.
 */

import { Effect, Layer } from "effect"
import { HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { createServer } from "node:http"
import { EmployeesApi } from "@acme/api/employee"
import { makeInMemoryEmployeeRepo } from "./repos/inMemory.js"

// Create HTTP router with our API endpoints
const HttpLive = HttpServer.router.empty.pipe(
  HttpServer.router.get("/employees", () =>
    Effect.gen(function* () {
      const repo = yield* makeInMemoryEmployeeRepo()
      const employees = yield* repo.list()
      return HttpServer.response.json(employees)
    })
  ),
  HttpServer.router.get("/employees/:id", () =>
    Effect.gen(function* () {
      const repo = yield* makeInMemoryEmployeeRepo()
      const { id } = yield* HttpServer.request.ServerRequest
      // TODO: Validate id as EmployeeId
      const employee = yield* repo.get(id as any)
      return HttpServer.response.json(employee)
    })
  ),
  HttpServer.router.put("/employees", () =>
    Effect.gen(function* () {
      const repo = yield* makeInMemoryEmployeeRepo()
      const employee = yield* HttpServer.request.schemaBodyJson(
        // Import Employee schema here
        {} as any
      )
      const updated = yield* repo.upsert(employee)
      return HttpServer.response.json(updated)
    })
  ),
  Layer.provide(HttpServer.server.layer({ port: 3000 }))
)

// Create the Node.js HTTP server
const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3000 })

// Compose layers and run
const program = Effect.gen(function* () {
  console.log("🚀 Server starting on http://localhost:3000")
  yield* Effect.never
})

program.pipe(
  Effect.provide(HttpLive),
  Effect.provide(ServerLive),
  NodeRuntime.runMain
)
