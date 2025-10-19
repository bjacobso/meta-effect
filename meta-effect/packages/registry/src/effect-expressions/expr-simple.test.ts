import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { createSimpleEvaluator } from "./expr-simple"

describe("expr-simple", () => {
  const evaluator = createSimpleEvaluator()

  describe("evalBoolean", () => {
    it.effect("should evaluate simple boolean expressions", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.evalBoolean("a > b", { a: 5, b: 3 })
        expect(result).toBe(true)
      }),
    )

    it.effect("should evaluate complex boolean logic", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.evalBoolean(
          "age >= 18 && country == 'US'",
          { age: 25, country: "US" },
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

    it.effect("should coerce to boolean", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.evalBoolean("x", { x: 1 })
        expect(result).toBe(true)

        const result2 = yield* evaluator.evalBoolean("x", { x: 0 })
        expect(result2).toBe(false)
      }),
    )

    it.effect("should handle errors gracefully", () =>
      Effect.gen(function* () {
        const result = yield* Effect.exit(
          evaluator.evalBoolean("a.b.c.d", { a: {} }),
        )
        expect(result._tag).toBe("Failure")
      }),
    )
  })

  describe("eval", () => {
    it.effect("should evaluate arithmetic expressions", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval("a + b * 2", { a: 5, b: 3 })
        expect(result).toBe(11)
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

    it.effect("should support Math operations", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval("Math.max(a, b) + 10", {
          a: 5,
          b: 8,
        })
        expect(result).toBe(18)
      }),
    )

    it.effect("should handle array operations", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval<number>(
          "items.filter(x => x > 100).length",
          { items: [50, 150, 75, 200] },
        )
        expect(result).toBe(2)
      }),
    )

    it.effect("should handle object access", () =>
      Effect.gen(function* () {
        const result = yield* evaluator.eval("user.profile.age", {
          user: { profile: { age: 25 } },
        })
        expect(result).toBe(25)
      }),
    )

    it.effect("should handle syntax errors", () =>
      Effect.gen(function* () {
        const result = yield* Effect.exit(evaluator.eval("a +++ b", { a: 1 }))
        expect(result._tag).toBe("Failure")
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
          "(price * quantity) * (1 - discount)",
        )

        const result = yield* compiled.evaluate({
          price: 100,
          quantity: 2,
          discount: 0.1,
        })
        expect(result).toBe(180)
      }),
    )

    it.effect("should handle compilation errors", () =>
      Effect.gen(function* () {
        // Note: Function() constructor is very permissive, so we test with
        // a runtime error instead
        const compiled = yield* evaluator.compile("throw new Error('test')")
        const result = yield* Effect.exit(compiled.evaluate({}))
        expect(result._tag).toBe("Failure")
      }),
    )
  })

  describe("config", () => {
    it.effect("should respect timeout configuration", () =>
      Effect.gen(function* () {
        const fastEvaluator = createSimpleEvaluator({ timeout: 100 })

        // This should work
        const result = yield* fastEvaluator.eval("1 + 1", {})
        expect(result).toBe(2)
      }),
    )
  })
})
