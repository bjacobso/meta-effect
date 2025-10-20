/**
 * CEL Expression Playground
 *
 * Interactive demo for testing CEL expressions with real-time evaluation
 */

import { useState, useEffect } from 'react'
import { Effect } from 'effect'
import { createCELEvaluator } from '../lib/effect-expressions/expr-cel'
import { ExpressionError } from '../lib/effect-expressions/expr-service'

const EXAMPLES = [
  {
    name: "Simple Boolean",
    expression: "age >= 18 && country == 'US'",
    context: { age: 25, country: "US" }
  },
  {
    name: "Collection Operations",
    expression: "'admin' in user.roles && has(user.email)",
    context: { user: { roles: ["admin", "user"], email: "admin@example.com" } }
  },
  {
    name: "Arithmetic",
    expression: "price * (1.0 - discount)",
    context: { price: 100, discount: 0.2 }
  },
  {
    name: "Ternary Expression",
    expression: "age >= 18 ? 'adult' : 'minor'",
    context: { age: 25 }
  },
  {
    name: "Feature Flag",
    expression: "user.plan == 'enterprise' && 'beta' in user.features",
    context: { user: { plan: "enterprise", features: ["beta", "premium"] } }
  },
  {
    name: "Access Control",
    expression: "user.role == 'admin' || user.id == resource.owner",
    context: { user: { id: "user-123", role: "editor" }, resource: { owner: "user-123" } }
  }
]

export function CELPlayground() {
  const [expression, setExpression] = useState(EXAMPLES[0].expression)
  const [contextJson, setContextJson] = useState(JSON.stringify(EXAMPLES[0].context, null, 2))
  const [result, setResult] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      evaluateExpression()
    }, 300) // Debounce 300ms

    return () => clearTimeout(timer)
  }, [expression, contextJson])

  const evaluateExpression = async () => {
    setEvaluating(true)
    setError("")
    setResult("")

    try {
      // Parse context JSON
      let context: Record<string, unknown>
      try {
        context = JSON.parse(contextJson)
      } catch (e) {
        setError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
        setEvaluating(false)
        return
      }

      // Create evaluator and run
      const evaluator = createCELEvaluator()
      const program = evaluator.eval(expression, context)

      const exit = await Effect.runPromiseExit(program)

      if (exit._tag === "Success") {
        // Format result nicely
        const value = exit.value
        if (typeof value === 'bigint') {
          setResult(String(value) + 'n')
        } else if (typeof value === 'object') {
          setResult(JSON.stringify(value, null, 2))
        } else {
          setResult(String(value))
        }
      } else {
        // Extract error message
        if (exit.cause._tag === "Fail") {
          const err = exit.cause.error
          if (err instanceof ExpressionError) {
            setError(`${err.reason}: ${err.message}`)
          } else {
            setError(String(err))
          }
        } else {
          setError("Unknown error occurred")
        }
      }
    } catch (e) {
      setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setEvaluating(false)
    }
  }

  const loadExample = (example: typeof EXAMPLES[0]) => {
    setExpression(example.expression)
    setContextJson(JSON.stringify(example.context, null, 2))
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB', colorScheme: 'light' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#111827' }}>
            CEL Expression Playground
          </h1>
          <p style={{ color: '#4B5563' }}>
            Test Common Expression Language (CEL) expressions in real-time with interactive editing
          </p>
          <div className="mt-4">
            <a
              href="/"
              className="underline"
              style={{ color: '#2563EB' }}
            >
              ← Back to Registry
            </a>
          </div>
        </div>

        {/* Examples */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: '#374151' }}>Examples</h2>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.name}
                onClick={() => loadExample(example)}
                className="px-4 py-2 border rounded-lg hover:border-gray-400 transition-colors text-sm font-medium"
                style={{ backgroundColor: '#FFFFFF', color: '#374151', borderColor: '#D1D5DB' }}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Expression Input */}
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                CEL Expression
              </label>
              <textarea
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                className="w-full h-32 px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ backgroundColor: '#FFFFFF', color: '#111827', borderColor: '#D1D5DB' }}
                placeholder="Enter CEL expression..."
              />
            </div>

            {/* Context Input */}
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                Context (JSON)
              </label>
              <textarea
                value={contextJson}
                onChange={(e) => setContextJson(e.target.value)}
                className="w-full h-64 px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ backgroundColor: '#FFFFFF', color: '#111827', borderColor: '#D1D5DB' }}
                placeholder='{ "key": "value" }'
              />
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            {/* Result Display */}
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold" style={{ color: '#374151' }}>
                  Result
                </label>
                {evaluating && (
                  <span className="text-xs" style={{ color: '#6B7280' }}>Evaluating...</span>
                )}
              </div>
              {error ? (
                <div className="border rounded-lg p-4" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
                  <p className="font-mono text-sm whitespace-pre-wrap" style={{ color: '#991B1B' }}>
                    {error}
                  </p>
                </div>
              ) : result ? (
                <div className="border rounded-lg p-4" style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
                  <p className="font-mono text-sm whitespace-pre-wrap" style={{ color: '#14532D' }}>
                    {result}
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-4" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}>
                  <p className="text-sm italic" style={{ color: '#6B7280' }}>
                    Result will appear here...
                  </p>
                </div>
              )}
            </div>

            {/* Documentation */}
            <div className="rounded-lg border p-6" style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#1E3A8A' }}>
                Supported Features
              </h3>
              <ul className="space-y-2 text-sm" style={{ color: '#1E40AF' }}>
                <li>• <strong>Comparisons:</strong> ==, !=, &lt;, &lt;=, &gt;, &gt;=</li>
                <li>• <strong>Logic:</strong> &&, ||, !</li>
                <li>• <strong>Arithmetic:</strong> +, -, *, /, %</li>
                <li>• <strong>Collections:</strong> in, has(), size(), exists()</li>
                <li>• <strong>Ternary:</strong> condition ? true_val : false_val</li>
                <li>• <strong>Strings:</strong> +, contains(), startsWith()</li>
              </ul>
              <div className="mt-4 pt-4" style={{ borderTopWidth: '1px', borderTopColor: '#BFDBFE' }}>
                <a
                  href="https://github.com/marcbachmann/cel-js"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-sm"
                  style={{ color: '#2563EB' }}
                >
                  View CEL Documentation →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
