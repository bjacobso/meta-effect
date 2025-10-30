/**
 * Modal State Management
 *
 * Jotai atoms for managing modal/dialog state with stack-based navigation.
 * Supports multiple simultaneous modals and return value passing.
 *
 * @example
 * ```ts
 * import { useAtom } from 'jotai'
 * import { createModalState } from './lib/effect-ui/modal-state'
 *
 * // Create modal state
 * const confirmModal = createModalState<boolean>()
 *
 * // In component
 * function ConfirmDialog() {
 *   const [isOpen] = useAtom(confirmModal.isOpenAtom)
 *   const [, close] = useAtom(confirmModal.closeAtom)
 *
 *   return (
 *     <Dialog open={isOpen}>
 *       <Button onClick={() => close(true)}>Confirm</Button>
 *       <Button onClick={() => close(false)}>Cancel</Button>
 *     </Dialog>
 *   )
 * }
 *
 * // Open modal and wait for result
 * const [, open] = useAtom(confirmModal.openAtom)
 * const result = await open({ title: "Are you sure?" })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { atom, type WritableAtom } from 'jotai'

export interface ModalProps {
  /** Modal title */
  title?: string
  /** Modal content/message */
  content?: string
  /** Custom data passed to modal */
  data?: any
}

export interface ModalState<T> {
  /** Atom tracking if modal is open */
  isOpenAtom: WritableAtom<boolean, [], boolean>
  /** Atom containing modal props */
  propsAtom: WritableAtom<ModalProps | null, [], ModalProps | null>
  /** Open the modal with props */
  openAtom: WritableAtom<null, [ModalProps?], Promise<T>>
  /** Close the modal with return value */
  closeAtom: WritableAtom<null, [T], void>
}

/**
 * Create modal state with promise-based return values
 */
export function createModalState<T = void>(): ModalState<T> {
  // Basic state
  const isOpenAtom = atom<boolean>(false)
  const propsAtom = atom<ModalProps | null>(null)

  // Promise resolver storage
  let resolveRef: ((value: T) => void) | null = null

  // Open atom that returns a promise
  const openAtom = atom(
    null,
    (get, set, props: ModalProps = {}) => {
      set(propsAtom, props)
      set(isOpenAtom, true)

      return new Promise<T>((resolve) => {
        resolveRef = resolve
      })
    }
  )

  // Close atom that resolves the promise
  const closeAtom = atom(
    null,
    (get, set, returnValue: T) => {
      set(isOpenAtom, false)
      set(propsAtom, null)

      if (resolveRef) {
        resolveRef(returnValue)
        resolveRef = null
      }
    }
  )

  return {
    isOpenAtom,
    propsAtom,
    openAtom,
    closeAtom,
  }
}

/**
 * Create a modal stack for managing multiple modals
 */
export interface ModalStackItem {
  id: string
  props: ModalProps
}

export interface ModalStack {
  /** Atom containing modal stack */
  stackAtom: WritableAtom<ModalStackItem[], [], ModalStackItem[]>
  /** Push modal to stack */
  pushAtom: WritableAtom<null, [string, ModalProps], void>
  /** Pop modal from stack */
  popAtom: WritableAtom<null, [], void>
  /** Close specific modal */
  closeByIdAtom: WritableAtom<null, [string], void>
}

/**
 * Create a modal stack for managing multiple modals
 */
export function createModalStack(): ModalStack {
  const stackAtom = atom<ModalStackItem[]>([])

  const pushAtom = atom(
    null,
    (get, set, id: string, props: ModalProps) => {
      const stack = get(stackAtom)
      set(stackAtom, [...stack, { id, props }])
    }
  )

  const popAtom = atom(
    null,
    (get, set) => {
      const stack = get(stackAtom)
      set(stackAtom, stack.slice(0, -1))
    }
  )

  const closeByIdAtom = atom(
    null,
    (get, set, id: string) => {
      const stack = get(stackAtom)
      set(stackAtom, stack.filter((item) => item.id !== id))
    }
  )

  return {
    stackAtom,
    pushAtom,
    popAtom,
    closeByIdAtom,
  }
}
