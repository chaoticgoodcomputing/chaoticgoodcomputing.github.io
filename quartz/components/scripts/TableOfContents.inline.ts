// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update TOC entry highlighting based on viewport intersection
 */
function _handleIntersection(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    const slug = entry.target.id
    const tocEntryElements = document.querySelectorAll(`a[data-for="${slug}"]`)
    const windowHeight = entry.rootBounds?.height
    if (windowHeight && tocEntryElements.length > 0) {
      if (entry.boundingClientRect.y < windowHeight) {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.add("in-view"))
      } else {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.remove("in-view"))
      }
    }
  }
}

const observer = new IntersectionObserver(_handleIntersection)

/**
 * Toggle TOC collapse state and update accessibility attributes
 */
function _toggleToc(this: HTMLElement): void {
  this.classList.toggle("collapsed")
  this.setAttribute(
    "aria-expanded",
    this.getAttribute("aria-expanded") === "true" ? "false" : "true",
  )
  const content = this.nextElementSibling as HTMLElement | undefined
  if (!content) return
  content.classList.toggle("collapsed")
}

/**
 * Observe all heading elements for intersection tracking
 */
function _observeHeaders(): void {
  observer.disconnect()
  const headers = document.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")
  headers.forEach((header) => observer.observe(header))
}

// ============================================================================
// MARK: MAIN
// ============================================================================

/**
 * Initialize table of contents functionality
 */
function setupToc(): void {
  for (const toc of document.getElementsByClassName("toc")) {
    const button = toc.querySelector(".toc-header")
    const content = toc.querySelector(".toc-content")
    if (!button || !content) return
    button.addEventListener("click", _toggleToc)
    window.addCleanup(() => button.removeEventListener("click", _toggleToc))
  }
}

document.addEventListener("nav", () => {
  setupToc()
  _observeHeaders()
})
