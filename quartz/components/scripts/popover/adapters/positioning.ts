import { computePosition, flip, inline, shift } from "@floating-ui/dom"
import { PopoverPointer } from "../core/types"

export async function setPosition(
  link: HTMLAnchorElement,
  popoverElement: HTMLElement,
  pointer: PopoverPointer,
) {
  const { x, y } = await computePosition(link, popoverElement, {
    strategy: "fixed",
    middleware: [inline({ x: pointer.clientX, y: pointer.clientY }), shift(), flip()],
  })

  Object.assign(popoverElement.style, {
    transform: `translate(${x.toFixed()}px, ${y.toFixed()}px)`,
  })
}
