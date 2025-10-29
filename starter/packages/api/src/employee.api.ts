/**
 * Employee API Contract
 *
 * Uses Effect HttpApi to bind routes to codecs and produce both server & client.
 * This is the single source of truth for the HTTP contract.
 */

import * as HttpApi from "@effect/platform/HttpApi"
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as S from "@effect/schema/Schema"
import { Employee, EmployeeId } from "@acme/domain/employee"
import { Routes } from "@acme/routes"

export class EmployeesApi extends HttpApiGroup.make("employees")
  .add(
    HttpApiEndpoint.get("list", Routes.Employees.list().path).addSuccess(
      S.Array(Employee)
    )
  )
  .add(
    HttpApiEndpoint.get("byId", Routes.Employees.byId(":id").path)
      .addSuccess(Employee)
      .setPath(S.Struct({ id: EmployeeId }))
  )
  .add(
    HttpApiEndpoint.put("upsert", Routes.Employees.upsert().path)
      .setPayload(Employee)
      .addSuccess(Employee)
  ) {}

export const Api = HttpApi.empty.add(EmployeesApi)
export type Api = typeof Api
