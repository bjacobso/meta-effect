import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { ErrorBoundary, DefaultErrorFallback } from "./error-boundary"
import React from "react"

// Component that throws error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error")
  }
  return <div>No error</div>
}

describe("ErrorBoundary", () => {
  it("should render children when no error occurs", () => {
    const { container } = render(
      <ErrorBoundary fallback={() => <div>Error occurred</div>}>
        <div>Content</div>
      </ErrorBoundary>
    )

    expect(container.textContent).toBe("Content")
  })

  it("should render fallback when error occurs", () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { container } = render(
      <ErrorBoundary fallback={() => <div>Error occurred</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(container.textContent).toBe("Error occurred")

    spy.mockRestore()
  })

  it("should call onError when error occurs", () => {
    const onError = vi.fn()
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <ErrorBoundary
        fallback={() => <div>Error occurred</div>}
        onError={onError}
      >
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    )

    spy.mockRestore()
  })
})

describe("DefaultErrorFallback", () => {
  it("should display error message", () => {
    const error = new Error("Test error message")
    const reset = vi.fn()

    const { container } = render(
      <DefaultErrorFallback error={error} reset={reset} />
    )

    expect(container.textContent).toContain("Test error message")
  })

  it("should display string error", () => {
    const error = "String error"
    const reset = vi.fn()

    const { container } = render(
      <DefaultErrorFallback error={error} reset={reset} />
    )

    expect(container.textContent).toContain("String error")
  })
})
