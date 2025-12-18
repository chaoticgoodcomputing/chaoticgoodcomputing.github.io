import { computePosition, flip, inline, shift } from "@floating-ui/dom"
import { normalizeRelativeURLs } from "../../util/path"
import { fetchCanonical } from "./util"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const p = new DOMParser()
let activeAnchor: HTMLAnchorElement | null = null

/**
 * Calculate and apply positioning for a popover element relative to its anchor
 */
async function _setPosition(
  link: HTMLAnchorElement,
  popoverElement: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const { x, y } = await computePosition(link, popoverElement, {
    strategy: "fixed",
    middleware: [inline({ x: clientX, y: clientY }), shift(), flip()],
  })
  Object.assign(popoverElement.style, {
    transform: `translate(${x.toFixed()}px, ${y.toFixed()}px)`,
  })
}

/**
 * Show the popover and scroll to hash target if present
 */
async function _showPopover(
  popoverElement: HTMLElement,
  link: HTMLAnchorElement,
  hash: string,
  clientX: number,
  clientY: number,
) {
  _clearActivePopover()
  popoverElement.classList.add("active-popover")
  await _setPosition(link, popoverElement, clientX, clientY)

  if (hash !== "") {
    const popoverInner = popoverElement.querySelector(".popover-inner") as HTMLElement
    const targetAnchor = `#popover-internal-${hash.slice(1)}`
    const heading = popoverInner.querySelector(targetAnchor) as HTMLElement | null
    if (heading) {
      // leave ~12px of buffer when scrolling to a heading
      popoverInner.scroll({ top: heading.offsetTop - 12, behavior: "instant" })
    }
  }
}

/**
 * Remove active state from all popovers
 */
function _clearActivePopover() {
  activeAnchor = null
  const allPopoverElements = document.querySelectorAll(".popover")
  allPopoverElements.forEach((popoverElement) => popoverElement.classList.remove("active-popover"))
}

/**
 * Create popover content for an image
 */
function _createImageContent(targetUrl: URL): HTMLImageElement {
  const img = document.createElement("img")
  img.src = targetUrl.toString()
  img.alt = targetUrl.pathname
  return img
}

/**
 * Create popover content for a PDF
 */
function _createPdfContent(targetUrl: URL): HTMLIFrameElement {
  const pdf = document.createElement("iframe")
  pdf.src = targetUrl.toString()
  return pdf
}

/**
 * Create popover content for HTML documents
 */
async function _createHtmlContent(
  response: Response,
  targetUrl: URL,
): Promise<HTMLElement[] | null> {
  const contents = await response.text()
  const html = p.parseFromString(contents, "text/html")
  normalizeRelativeURLs(html, targetUrl)

  // Prepend all IDs inside popovers to prevent duplicates
  html.querySelectorAll("[id]").forEach((el) => {
    const targetID = `popover-internal-${el.id}`
    el.id = targetID
  })

  const elts = [...html.getElementsByClassName("popover-hint")]
  if (elts.length === 0) return null

  return elts as HTMLElement[]
}

/**
 * Create the popover element structure
 */
function _createPopoverElement(popoverId: string): {
  popoverElement: HTMLDivElement
  popoverInner: HTMLDivElement
} {
  const popoverElement = document.createElement("div")
  popoverElement.id = popoverId
  popoverElement.classList.add("popover")

  const popoverInner = document.createElement("div")
  popoverInner.classList.add("popover-inner")
  popoverElement.appendChild(popoverInner)

  return { popoverElement, popoverInner }
}

/**
 * Populate popover content based on content type
 */
async function _populatePopoverContent(
  popoverInner: HTMLDivElement,
  response: Response,
  targetUrl: URL,
): Promise<boolean> {
  const [contentType] = response.headers.get("Content-Type")!.split(";")
  const [contentTypeCategory, typeInfo] = contentType.split("/")

  popoverInner.dataset.contentType = contentType ?? undefined

  switch (contentTypeCategory) {
    case "image":
      popoverInner.appendChild(_createImageContent(targetUrl))
      return true

    case "application":
      if (typeInfo === "pdf") {
        popoverInner.appendChild(_createPdfContent(targetUrl))
        return true
      }
      return false

    default:
      const elements = await _createHtmlContent(response, targetUrl)
      if (!elements) return false
      elements.forEach((elt) => popoverInner.appendChild(elt))
      return true
  }
}

// ============================================================================
// MARK: MAIN
// ============================================================================

/**
 * Handle mouse enter on an internal link to show popover
 * @param clientX - Mouse X position
 * @param clientY - Mouse Y position
 */
async function mouseEnterHandler(
  this: HTMLAnchorElement,
  { clientX, clientY }: { clientX: number; clientY: number },
) {
  const link = (activeAnchor = this)
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
    await _showPopover(prevPopoverElement as HTMLElement, link, hash, clientX, clientY)
    return
  }

  // Fetch content for new popover
  const response = await fetchCanonical(targetUrl).catch((err) => {
    console.error(err)
  })
  if (!response) return

  // Create popover structure
  const { popoverElement, popoverInner } = _createPopoverElement(popoverId)

  // Populate content based on type
  const success = await _populatePopoverContent(popoverInner, response, targetUrl)
  if (!success) return

  // Check if popover was already created while we were fetching
  if (document.getElementById(popoverId)) {
    return
  }

  document.body.appendChild(popoverElement)

  // Check if user already moved away
  if (activeAnchor !== this) {
    return
  }

  await _showPopover(popoverElement, link, hash, clientX, clientY)
}

/**
 * Initialize popover functionality for all internal links
 */
function setupPopovers() {
  const links = [...document.querySelectorAll("a.internal")] as HTMLAnchorElement[]
  for (const link of links) {
    link.addEventListener("mouseenter", mouseEnterHandler)
    link.addEventListener("mouseleave", _clearActivePopover)
    window.addCleanup(() => {
      link.removeEventListener("mouseenter", mouseEnterHandler)
      link.removeEventListener("mouseleave", _clearActivePopover)
    })
  }
}

document.addEventListener("nav", setupPopovers)
