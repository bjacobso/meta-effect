import type { Meta, StoryObj } from '@storybook/react'
import { useAtom } from 'jotai'
import { createModalState, createModalStack } from '../src/modal-state'
import React from 'react'

const meta = {
  title: 'Effect UI/ModalState',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Simple confirm modal state
const confirmModal = createModalState<boolean>()

function ConfirmDialog() {
  const [isOpen] = useAtom(confirmModal.isOpenAtom)
  const [props] = useAtom(confirmModal.propsAtom)
  const [, close] = useAtom(confirmModal.closeAtom)

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          minWidth: '300px',
        }}
      >
        <h2>{props?.title || 'Confirm'}</h2>
        <p>{props?.content || 'Are you sure?'}</p>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => close(true)}
            style={{
              padding: '10px 20px',
              background: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => close(false)}
            style={{
              padding: '10px 20px',
              background: '#ccc',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDemo() {
  const [, open] = useAtom(confirmModal.openAtom)
  const [result, setResult] = React.useState<string>('No action yet')

  const handleClick = async () => {
    const confirmed = await open({
      title: 'Delete Item',
      content: 'Are you sure you want to delete this item? This action cannot be undone.',
    })
    setResult(confirmed ? 'User confirmed' : 'User cancelled')
  }

  return (
    <div>
      <button onClick={handleClick} style={{ padding: '10px 20px' }}>
        Open Confirm Modal
      </button>
      <p style={{ marginTop: '10px' }}>Result: {result}</p>
      <ConfirmDialog />
    </div>
  )
}

// Modal stack demo
const modalStack = createModalStack()

function StackedModals() {
  const [stack] = useAtom(modalStack.stackAtom)
  const [, push] = useAtom(modalStack.pushAtom)
  const [, pop] = useAtom(modalStack.popAtom)

  return (
    <div>
      <button
        onClick={() =>
          push(`modal-${Date.now()}`, {
            title: `Modal ${stack.length + 1}`,
            content: `This is modal number ${stack.length + 1}`,
          })
        }
        style={{ padding: '10px 20px' }}
      >
        Open Modal
      </button>

      <p style={{ marginTop: '10px' }}>Active modals: {stack.length}</p>

      {stack.map((modal, index) => (
        <div
          key={modal.id}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000 + index,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              minWidth: '300px',
              transform: `scale(${1 - index * 0.05})`,
            }}
          >
            <h2>{modal.props.title}</h2>
            <p>{modal.props.content}</p>
            <button
              onClick={pop}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export const ConfirmModal: Story = {
  render: () => <ConfirmDemo />,
}

export const ModalStack: Story = {
  render: () => <StackedModals />,
}
