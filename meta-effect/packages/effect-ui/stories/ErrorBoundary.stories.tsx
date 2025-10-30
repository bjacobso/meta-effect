import type { Meta, StoryObj } from '@storybook/react'
import { ErrorBoundary, DefaultErrorFallback } from '../src/error-boundary'
import React, { useState } from 'react'

const meta = {
  title: 'Effect UI/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorBoundary>

export default meta
type Story = StoryObj<typeof meta>

// Component that can throw errors
function ProblematicComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Something went wrong in the component!')
  }
  return <div>Everything is working fine</div>
}

// Interactive demo
function ErrorDemo() {
  const [shouldThrow, setShouldThrow] = useState(false)

  return (
    <div>
      <button
        onClick={() => setShouldThrow(true)}
        style={{ marginBottom: '20px', padding: '10px 20px' }}
      >
        Trigger Error
      </button>

      <ErrorBoundary
        fallback={(error, reset) => (
          <div style={{ padding: '20px', border: '2px solid red', borderRadius: '8px' }}>
            <h2>Error Caught!</h2>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {error instanceof Error ? error.message : String(error)}
            </pre>
            <button
              onClick={() => {
                reset()
                setShouldThrow(false)
              }}
              style={{ padding: '10px 20px', marginTop: '10px' }}
            >
              Reset and Try Again
            </button>
          </div>
        )}
      >
        <ProblematicComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </div>
  )
}

export const Basic: Story = {
  render: () => (
    <ErrorBoundary
      fallback={(error, reset) => <DefaultErrorFallback error={error} reset={reset} />}
    >
      <div>This component has no errors</div>
    </ErrorBoundary>
  ),
}

export const WithError: Story = {
  render: () => (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div style={{ padding: '20px', border: '2px solid red' }}>
          <h2>Error:</h2>
          <p>{error instanceof Error ? error.message : String(error)}</p>
          <button onClick={reset}>Reset</button>
        </div>
      )}
    >
      <ProblematicComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
}

export const Interactive: Story = {
  render: () => <ErrorDemo />,
}

export const CustomFallback: Story = {
  render: () => (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div
          style={{
            padding: '40px',
            background: '#fee',
            border: '2px solid #c00',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <h1>Oops!</h1>
          <p>Something unexpected happened</p>
          <details style={{ marginTop: '20px', textAlign: 'left' }}>
            <summary>Error Details</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {error instanceof Error ? error.stack : String(error)}
            </pre>
          </details>
          <button
            onClick={reset}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#c00',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      )}
    >
      <ProblematicComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
}
