#!/usr/bin/env tsx
/**
 * CEL Expression Demo
 *
 * Demonstrates practical usage patterns for the CEL evaluator including:
 * - Feature flags and gates
 * - Access control policies
 * - Business rules
 * - Custom functions
 *
 * Run with: pnpm tsx src/effect-expressions/expr-cel-demo.ts
 */

import { Effect, Console } from "effect"
import { createCELEvaluator } from "./expr-cel.js"

// Example 1: Feature Flags
const featureFlagExample = Effect.gen(function* () {
  const evaluator = createCELEvaluator()

  yield* Console.log("\n=== Feature Flag Example ===")

  const user = {
    id: "user-123",
    email: "admin@example.com",
    roles: ["admin", "beta-tester"],
    plan: "enterprise",
    createdAt: "2024-01-15",
  }

  // Complex feature gate
  const canAccessNewUI = yield* evaluator.evalBoolean(
    "user.plan == 'enterprise' && 'beta-tester' in user.roles",
    { user },
  )

  yield* Console.log(`Can access new UI: ${canAccessNewUI}`)

  // Graduated rollout based on user ID
  const inBetaRollout = yield* evaluator.evalBoolean(
    "user.id.startsWith('user-1') && user.plan != 'free'",
    { user },
  )

  yield* Console.log(`In beta rollout: ${inBetaRollout}`)
})

// Example 2: Access Control Policies
const accessControlExample = Effect.gen(function* () {
  const evaluator = createCELEvaluator()

  yield* Console.log("\n=== Access Control Example ===")

  const request = {
    user: {
      id: "user-456",
      roles: ["editor"],
      department: "engineering",
    },
    resource: {
      type: "document",
      owner: "user-789",
      department: "engineering",
      visibility: "department",
    },
    action: "edit",
  }

  // Policy: Can edit if owner OR same department + has editor role
  const canEdit = yield* evaluator.evalBoolean(
    `(request.user.id == request.resource.owner) ||
     (request.resource.visibility == 'department' &&
      request.user.department == request.resource.department &&
      'editor' in request.user.roles)`,
    { request },
  )

  yield* Console.log(`Can edit document: ${canEdit}`)
})

// Example 3: Business Rules
const businessRulesExample = Effect.gen(function* () {
  const evaluator = createCELEvaluator()

  yield* Console.log("\n=== Business Rules Example ===")

  // Shipping cost calculation
  const order = {
    items: [
      { name: "Laptop", price: 1200, weight: 2.5 },
      { name: "Mouse", price: 25, weight: 0.2 },
    ],
    destination: "US",
    isPrime: true,
  }

  // Calculate total price
  const totalPrice = order.items.reduce((sum, item) => sum + item.price, 0)

  // Free shipping for Prime members or orders over $1000
  const freeShipping = yield* evaluator.evalBoolean(
    "order.isPrime || totalPrice > 1000",
    { order, totalPrice },
  )

  yield* Console.log(`Free shipping eligible: ${freeShipping}`)

  // Calculate total weight using reduce in JS (CEL doesn't have sum())
  const totalWeight = order.items.reduce((sum, item) => sum + item.weight, 0)

  yield* Console.log(`Total weight: ${totalWeight}kg`)
})

// Example 4: Alert/Incident Routing
const incidentRoutingExample = Effect.gen(function* () {
  const evaluator = createCELEvaluator()

  yield* Console.log("\n=== Incident Routing Example ===")

  const incident = {
    severity: "SEV-1",
    service: "payment-gateway",
    errorRate: 0.45,
    customerImpact: true,
    region: "us-east-1",
    businessHours: true,
  }

  // Critical incident detection
  const isCritical = yield* evaluator.evalBoolean(
    `incident.severity == 'SEV-1' && incident.customerImpact == true`,
    { incident },
  )

  yield* Console.log(`Is critical incident: ${isCritical}`)

  // Determine escalation level
  const escalationLevel = yield* evaluator.eval<string>(
    `incident.severity == 'SEV-1' && incident.errorRate > 0.3
      ? 'page-executives'
      : incident.severity == 'SEV-2' && incident.businessHours
        ? 'page-oncall'
        : 'create-ticket'`,
    { incident },
  )

  yield* Console.log(`Escalation level: ${escalationLevel}`)
})

// Example 5: Custom Functions for Domain Logic
const customFunctionsExample = Effect.gen(function* () {
  yield* Console.log("\n=== Custom Functions Example ===")

  const evaluator = createCELEvaluator({
    extensions: [
      {
        name: "calculateDiscount",
        signature: "calculateDiscount(int, string): double",
        impl: (price: bigint, tier: string) => {
          const priceNum = Number(price)
          const discounts: Record<string, number> = {
            gold: 0.2,
            silver: 0.1,
            bronze: 0.05,
          }
          return priceNum * (1 - (discounts[tier] || 0))
        },
      },
      {
        name: "isWeekend",
        signature: "isWeekend(string): bool",
        impl: (dayName: string) => dayName === "Saturday" || dayName === "Sunday",
      },
    ],
  })

  // Custom function with literal values
  const goldPrice = yield* evaluator.eval<number>(
    "calculateDiscount(100, 'gold')",
    {},
  )

  yield* Console.log(`Gold tier discount on $100: $${goldPrice}`)

  const silverPrice = yield* evaluator.eval<number>(
    "calculateDiscount(100, 'silver')",
    {},
  )

  yield* Console.log(`Silver tier discount on $100: $${silverPrice}`)

  // Weekend check
  const isItWeekend = yield* evaluator.evalBoolean(
    "isWeekend('Saturday')",
    {},
  )

  yield* Console.log(`Is Saturday a weekend: ${isItWeekend}`)
})

// Example 6: Complex Data Validation
const dataValidationExample = Effect.gen(function* () {
  const evaluator = createCELEvaluator()

  yield* Console.log("\n=== Data Validation Example ===")

  const formData = {
    email: "user@example.com",
    age: 25,
    termsAccepted: true,
    notifications: {
      email: true,
      sms: false,
    },
  }

  // Validate form submission
  const isValidSubmission = yield* evaluator.evalBoolean(
    `formData.email.contains('@') &&
     formData.age >= 18 &&
     formData.termsAccepted == true &&
     (formData.notifications.email == true || formData.notifications.sms == true)`,
    { formData },
  )

  yield* Console.log(`Is valid submission: ${isValidSubmission}`)
})

// Run all examples
const main = Effect.gen(function* () {
  yield* Console.log("CEL Expression Evaluator Demo")
  yield* Console.log("=" .repeat(50))

  yield* featureFlagExample
  yield* accessControlExample
  yield* businessRulesExample
  yield* incidentRoutingExample
  yield* customFunctionsExample
  yield* dataValidationExample

  yield* Console.log("\n" + "=".repeat(50))
  yield* Console.log("Demo complete!")
})

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  Effect.runPromise(main)
}

export { main as celDemo }
