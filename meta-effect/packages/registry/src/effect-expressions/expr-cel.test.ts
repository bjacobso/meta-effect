import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { createCELEvaluator } from "./expr-cel"

describe("expr-cel", () => {
  const evaluator = createCELEvaluator()

  describe("evalBoolean", () => {
    it.effect("should evaluate simple boolean expressions", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.evalBoolean("5 > 3", {})
        expect(result).toBe(true)
      }),
    )

    it.effect("should evaluate complex boolean logic", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.evalBoolean(
          "user.age >= 18 && user.country == 'US'",
          { user: { age: 25, country: "US" } },
        )
        expect(result).toBe(true)
      }),
    )

    it.effect("should handle false conditions", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.evalBoolean(
          "severity == 'SEV-1' && customerImpact == true",
          { severity: "SEV-2", customerImpact: false },
        )
        expect(result).toBe(false)
      }),
    )

    it.effect("should handle 'in' operator for collections", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.evalBoolean(
          "'admin' in user.roles",
          { user: { roles: ["admin", "user"] } },
        )
        expect(result).toBe(true)
      }),
    )

    it.effect("should handle has() macro", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.evalBoolean(
          "has(user.email)",
          { user: { name: "John" } },
        )
        expect(result).toBe(false)

        const result2 = yield* evaluator.evalBoolean(
          "has(user.name)",
          { user: { name: "John" } },
        )
        expect(result2).toBe(true)
      }),
    )

    it.effect("should coerce to boolean", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.evalBoolean("1", {})
        expect(result).toBe(true)

        const result2 = yield* evaluator.evalBoolean("0", {})
        expect(result2).toBe(false)
      }),
    )
  })

  describe("eval", () => {
    it.effect("should evaluate arithmetic expressions", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval<number>("5 + 3 * 2", {})
        expect(result).toBe(11n)
      }),
    )

    it.effect("should evaluate string concatenation", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval(
          "firstName + ' ' + lastName",
          { firstName: "John", lastName: "Doe" },
        )
        expect(result).toBe("John Doe")
      }),
    )

    it.effect("should evaluate ternary expressions", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval(
          "age >= 18 ? 'adult' : 'minor'",
          { age: 25 },
        )
        expect(result).toBe("adult")
      }),
    )

    it.effect("should handle list operations", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval<number>(
          "[1, 2, 3].size()",
          {},
        )
        expect(result).toBe(3n)
      }),
    )

    it.effect("should handle object access", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval("user.profile.age", {
          user: { profile: { age: 25 } },
        })
        // CEL returns numbers from context as-is, not as bigints
        expect(result).toBe(25)
      }),
    )

    it.effect("should evaluate discount calculation", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval<number>(
          "price * (1.0 - discount)",
          { price: 100, discount: 0.2 },
        )
        expect(result).toBe(80)
      }),
    )
  })

  describe("compile", () => {
    it.effect("should compile and reuse expressions efficiently", () =>
      Effect.gen(function* () {
        const compiled = yield* evaluator.compile<boolean>("age >= minAge")

        const result1 = yield* compiled.evaluate({ age: 25, minAge: 18 })
        expect(result1).toBe(true)

        const result2 = yield* compiled.evaluate({ age: 16, minAge: 18 })
        expect(result2).toBe(false)

        const result3 = yield* compiled.evaluate({ age: 30, minAge: 21 })
        expect(result3).toBe(true)
      }),
    )

    it.effect("should compile complex expressions", () =>
      Effect.gen(function* () {
        const compiled = yield* evaluator.compile<number>(
          "(price * quantity) * (1.0 - discount)",
        )

        const result = yield* compiled.evaluate({
          price: 100,
          quantity: 2,
          discount: 0.1,
        })
        expect(result).toBe(180)
      }),
    )

    it.effect("should compile list filtering expressions", () =>
      Effect.gen(function* () {
        const compiled = yield* evaluator.compile<boolean>(
          "items.exists(i, i.price > 100)",
        )

        const result1 = yield* compiled.evaluate({
          items: [
            { name: "Widget", price: 50 },
            { name: "Gadget", price: 150 },
          ],
        })
        expect(result1).toBe(true)

        const result2 = yield* compiled.evaluate({
          items: [
            { name: "Widget", price: 50 },
            { name: "Tool", price: 75 },
          ],
        })
        expect(result2).toBe(false)
      }),
    )
  })

  describe("custom extensions", () => {
    it.effect("should support custom functions", () =>
      Effect.gen(function* () {
        const customEvaluator = createCELEvaluator({
          extensions: [
            {
              name: "doubleIt",
              // CEL signature format: functionName(argType): returnType
              signature: "doubleIt(int): int",
              impl: (x: bigint) => x * 2n,
            },
          ],
        })

        const result = yield* customEvaluator.eval<number>("doubleIt(5)", {})
        expect(result).toBe(10n)
      }),
    )

    it.effect("should support multiple custom functions", () =>
      Effect.gen(function* () {
        const customEvaluator = createCELEvaluator({
          extensions: [
            {
              name: "doubleIt",
              signature: "doubleIt(int): int",
              impl: (x: bigint) => x * 2n,
            },
            {
              name: "greet",
              signature: "greet(string): string",
              impl: (name: string) => `Hello, ${name}!`,
            },
          ],
        })

        // Test string function with string literal
        const result = yield* customEvaluator.eval<string>(
          "greet('World')",
          {},
        )
        expect(result).toBe("Hello, World!")

        // Test int function
        const result2 = yield* customEvaluator.eval<number>("doubleIt(10)", {})
        expect(result2).toBe(20n)
      }),
    )
  })

  describe("error handling", () => {
    it.effect("should handle syntax errors", () =>
      Effect.gen(function* () {
        const result = yield* Effect.exit(evaluator.eval("a +++ b", { a: 1 }))
        expect(result._tag).toBe("Failure")
        if (result._tag === "Failure") {
          expect(result.cause._tag).toBe("Fail")
        }
      }),
    )

    it.effect("should handle undefined variable access", () =>
      Effect.gen(function* () {
        const result = yield* Effect.exit(
          evaluator.eval("nonexistent.property", {}),
        )
        expect(result._tag).toBe("Failure")
      }),
    )
  })
})
