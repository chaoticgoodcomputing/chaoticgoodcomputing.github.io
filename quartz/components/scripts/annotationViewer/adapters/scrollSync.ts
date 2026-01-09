import { findTextPositionInPDF } from "../core/textExtraction"

/**
 * Tracks which panel is currently being scrolled by the user
 */
type ScrollSource = "pdf" | "sidebar" | "programmatic" | null

/**
 * Set up bidirectional scroll synchronization between PDF and annotations
 */
export function setupScrollSync(viewer: Element): void {
  const pdfContainer = viewer.querySelector(".annotation-pdf-container") as HTMLElement
  const sidebar = viewer.querySelector(".annotation-sidebar") as HTMLElement
  const annotationItems = Array.from(
    sidebar?.querySelectorAll(".annotation-item") || [],
  ) as HTMLElement[]

  if (annotationItems.length === 0 || !pdfContainer || !sidebar) return

  // Position annotations based on PDF text positions
  annotationItems.forEach((annotation) => {
    const start = parseInt(annotation.getAttribute("data-start") || "0")
    const end = parseInt(annotation.getAttribute("data-end") || "0")

    if (start && end && window.pdfTextData) {
      const position = findTextPositionInPDF(start, end)
      if (position) {
        annotation.setAttribute("data-pdf-y", position.y.toString())
        annotation.setAttribute("data-pdf-page", position.pageNum.toString())
        console.log(
          "[Annotation]",
          annotation.getAttribute("data-annotation-id"),
          "at page",
          position.pageNum,
          "y:",
          position.y,
        )
      }
    }
  })

  // State management for scroll synchronization
  let scrollSource: ScrollSource = null
  let programmaticScrollTarget: HTMLElement | null = null
  let debounceTimeout: NodeJS.Timeout | null = null
  let resetSourceTimeout: NodeJS.Timeout | null = null

  /**
   * Set the scroll source and schedule reset
   */
  function setScrollSource(source: ScrollSource, duration: number = 600): void {
    scrollSource = source
    
    if (resetSourceTimeout) clearTimeout(resetSourceTimeout)
    
    if (source !== null) {
      resetSourceTimeout = setTimeout(() => {
        scrollSource = null
        programmaticScrollTarget = null
      }, duration)
    }
  }

  /**
   * Detect if a scroll event is user-initiated on a specific element
   */
  function isUserScroll(element: HTMLElement): boolean {
    // If we're in programmatic mode and this is the target, it's not user scroll
    if (scrollSource === "programmatic" && programmaticScrollTarget === element) {
      return false
    }
    
    // If scroll source is already set to the other panel, this is programmatic
    if (scrollSource === "pdf" && element === sidebar) return false
    if (scrollSource === "sidebar" && element === pdfContainer) return false
    
    // Otherwise, it's a user scroll
    return true
  }

  // Track user interaction to detect scroll intent
  let pdfUserInteracting = false
  let sidebarUserInteracting = false

  pdfContainer.addEventListener("mouseenter", () => { pdfUserInteracting = true })
  pdfContainer.addEventListener("mouseleave", () => { pdfUserInteracting = false })
  sidebar.addEventListener("mouseenter", () => { sidebarUserInteracting = true })
  sidebar.addEventListener("mouseleave", () => { sidebarUserInteracting = false })

  // Debounced scroll handlers
  const onPdfScroll = () => {
    if (!isUserScroll(pdfContainer)) return

    // Set source if this is user-initiated
    if (pdfUserInteracting && scrollSource !== "pdf") {
      setScrollSource("pdf")
    }

    // Clear existing timeout
    if (debounceTimeout) clearTimeout(debounceTimeout)

    // Debounce to wait for scroll to settle
    debounceTimeout = setTimeout(() => {
      if (scrollSource !== "pdf") return

      const scrollTop = pdfContainer.scrollTop
      const scrollCenter = scrollTop + pdfContainer.clientHeight / 2

      let closestAnnotation = null
      let minDistance = Infinity

      annotationItems.forEach((ann) => {
        const pdfY = parseFloat(ann.getAttribute("data-pdf-y") || "0")
        if (pdfY > 0) {
          const distance = Math.abs(pdfY - scrollCenter)
          if (distance < minDistance) {
            minDistance = distance
            closestAnnotation = ann
          }
        }
      })

      if (closestAnnotation) {
        syncToAnnotation(closestAnnotation)
      }
    }, 150)
  }

  // When annotations scroll, find closest annotation and center its highlight in PDF
  const onAnnotationScroll = () => {
    if (!isUserScroll(sidebar)) return

    // Set source if this is user-initiated
    if (sidebarUserInteracting && scrollSource !== "sidebar") {
      setScrollSource("sidebar")
    }

    // Clear existing timeout
    if (debounceTimeout) clearTimeout(debounceTimeout)

    // Debounce to wait for scroll to settle
    debounceTimeout = setTimeout(() => {
      if (scrollSource !== "sidebar") return

      const scrollTop = sidebar.scrollTop
      const scrollCenter = scrollTop + sidebar.clientHeight / 2

      let closestAnnotation: HTMLElement | null = null
      let minDistance = Infinity

      annotationItems.forEach((ann) => {
        const annotationTop = ann.offsetTop
        const annotationCenter = annotationTop + ann.clientHeight / 2
        const distance = Math.abs(annotationCenter - scrollCenter)

        if (distance < minDistance) {
          minDistance = distance
          closestAnnotation = ann
        }
      })

      if (closestAnnotation) {
        syncToPDF(closestAnnotation)
      }
    }, 150)
  }

  /**
   * Sync sidebar to match PDF scroll position
   */
  function syncToAnnotation(activeAnnotation: HTMLElement): void {
    updateActiveAnnotation(activeAnnotation)

    // Scroll annotation into center view
    setScrollSource("programmatic", 600)
    programmaticScrollTarget = sidebar

    const annotationTop = activeAnnotation.offsetTop
    const targetScroll =
      annotationTop - sidebar.clientHeight / 2 + activeAnnotation.clientHeight / 2
    sidebar.scrollTo({ top: targetScroll, behavior: "smooth" })
  }

  /**
   * Sync PDF to match sidebar scroll position
   */
  function syncToPDF(activeAnnotation: HTMLElement): void {
    updateActiveAnnotation(activeAnnotation)

    const pdfY = parseFloat(activeAnnotation.getAttribute("data-pdf-y") || "0")
    if (pdfY > 0) {
      setScrollSource("programmatic", 600)
      programmaticScrollTarget = pdfContainer

      const targetScroll = pdfY - pdfContainer.clientHeight / 2
      pdfContainer.scrollTo({ top: targetScroll, behavior: "smooth" })
    }
  }

  /**
   * Update which annotation is marked as active and render highlights
   */
  function updateActiveAnnotation(activeAnnotation: HTMLElement): void {
    // Mark as active
    annotationItems.forEach((ann) => {
      if (ann === activeAnnotation) {
        ann.classList.add("active")
      } else {
        ann.classList.remove("active")
      }
    })

    // Render highlight for active annotation
    const annotationId = activeAnnotation.getAttribute("data-annotation-id")
    const annotationData = window.annotationsData?.find((a) => a.id === annotationId)
    if (annotationData) {
      window.renderHighlights(annotationData)
    }
  }

  pdfContainer.addEventListener("scroll", onPdfScroll)
  sidebar.addEventListener("scroll", onAnnotationScroll)

  // Click annotation to scroll to its position in PDF
  annotationItems.forEach((annotation) => {
    annotation.addEventListener("click", () => {
      const pdfY = parseFloat(annotation.getAttribute("data-pdf-y") || "0")
      if (pdfY > 0) {
        setScrollSource("programmatic", 600)
        programmaticScrollTarget = pdfContainer

        const scrollTarget = pdfY - pdfContainer.clientHeight / 2
        pdfContainer.scrollTo({ top: scrollTarget, behavior: "smooth" })

        updateActiveAnnotation(annotation)
      }
    })
  })

  // Initial update
  setScrollSource("pdf", 100)
  setTimeout(() => onPdfScroll(), 50)
}
