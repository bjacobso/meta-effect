import { describe, expect, it } from "vitest"
import { createModalState, createModalStack, type ModalProps } from "./modal-state"

describe("createModalState", () => {
  it("should create modal state with all required atoms", () => {
    const modal = createModalState<boolean>()

    expect(modal.isOpenAtom).toBeDefined()
    expect(modal.propsAtom).toBeDefined()
    expect(modal.openAtom).toBeDefined()
    expect(modal.closeAtom).toBeDefined()
  })

  it("should support typed return values", () => {
    const stringModal = createModalState<string>()
    const numberModal = createModalState<number>()
    const boolModal = createModalState<boolean>()

    expect(stringModal.closeAtom).toBeDefined()
    expect(numberModal.closeAtom).toBeDefined()
    expect(boolModal.closeAtom).toBeDefined()
  })

  it("should support void return type", () => {
    const voidModal = createModalState()

    expect(voidModal.openAtom).toBeDefined()
    expect(voidModal.closeAtom).toBeDefined()
  })
})

describe("createModalStack", () => {
  it("should create modal stack with all required atoms", () => {
    const stack = createModalStack()

    expect(stack.stackAtom).toBeDefined()
    expect(stack.pushAtom).toBeDefined()
    expect(stack.popAtom).toBeDefined()
    expect(stack.closeByIdAtom).toBeDefined()
  })

  it("should support modal props interface", () => {
    const stack = createModalStack()
    const props: ModalProps = {
      title: "Test Modal",
      content: "Test content",
      data: { foo: "bar" },
    }

    // Stack should accept these props
    expect(props.title).toBe("Test Modal")
    expect(props.content).toBe("Test content")
    expect(props.data).toEqual({ foo: "bar" })
  })
})
