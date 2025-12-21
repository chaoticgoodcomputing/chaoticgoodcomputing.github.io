import { PopoverController } from "../core/PopoverController"
import { PopoverPointer } from "../core/types"

const controller = new PopoverController()

async function onMouseEnter(e: MouseEvent) {
  const link = e.currentTarget as HTMLAnchorElement | null
  if (!link) return
  const pointer: PopoverPointer = { clientX: e.clientX, clientY: e.clientY }
  await controller.handleMouseEnter(link, pointer)
}

function onMouseLeave() {
  controller.clearActivePopover()
}

export function setupPopovers() {
  const links = [...document.querySelectorAll("a.internal")] as HTMLAnchorElement[]
  for (const link of links) {
    link.addEventListener("mouseenter", onMouseEnter)
    link.addEventListener("mouseleave", onMouseLeave)
    window.addCleanup(() => {
      link.removeEventListener("mouseenter", onMouseEnter)
      link.removeEventListener("mouseleave", onMouseLeave)
    })
  }
}
