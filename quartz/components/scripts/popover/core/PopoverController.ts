import { PopoverPointer } from "./types"
import { fetchPopoverTarget } from "../adapters/fetch"
import { setPosition } from "../adapters/positioning"
import { createPopoverElement } from "../ui/dom"
import { populatePopoverContent } from "../ui/content"

export class PopoverController {
  private domParser = new DOMParser()
  private activeAnchor: HTMLAnchorElement | null = null

  clearActivePopover() {
    this.activeAnchor = null
    const allPopoverElements = document.querySelectorAll(".popover")
    allPopoverElements.forEach((popoverElement) =>
      popoverElement.classList.remove("active-popover"),
    )
  }

  private async showPopover(
    popoverElement: HTMLElement,
    link: HTMLAnchorElement,
    hash: string,
    pointer: PopoverPointer,
  ) {
    this.clearActivePopover()
    popoverElement.classList.add("active-popover")
    await setPosition(link, popoverElement, pointer)

    if (hash !== "") {
      const popoverInner = popoverElement.querySelector(".popover-inner") as HTMLElement
      const targetAnchor = `#popover-internal-${hash.slice(1)}`
      const heading = popoverInner.querySelector(targetAnchor) as HTMLElement | null
      if (heading) {
        popoverInner.scroll({ top: heading.offsetTop - 12, behavior: "instant" })
      }
    }
  }

  async handleMouseEnter(link: HTMLAnchorElement, pointer: PopoverPointer) {
    this.activeAnchor = link
    if (link.dataset.noPopover === "true") {
      return
    }

    const targetUrl = new URL(link.href)
    const hash = decodeURIComponent(targetUrl.hash)
    targetUrl.hash = ""
    targetUrl.search = ""

    const popoverId = `popover-${link.pathname}`

    // Reuse existing popover if available
    const prevPopoverElement = document.getElementById(popoverId)
    if (prevPopoverElement) {
      await this.showPopover(prevPopoverElement as HTMLElement, link, hash, pointer)
      return
    }

    const response = await fetchPopoverTarget(targetUrl)
    if (!response) return

    const { popoverElement, popoverInner } = createPopoverElement(popoverId)
    const success = await populatePopoverContent(this.domParser, popoverInner, response, targetUrl)
    if (!success) return

    // Check if popover was already created while we were fetching
    if (document.getElementById(popoverId)) {
      return
    }

    document.body.appendChild(popoverElement)

    // Check if user already moved away
    if (this.activeAnchor !== link) {
      return
    }

    await this.showPopover(popoverElement, link, hash, pointer)
  }
}
