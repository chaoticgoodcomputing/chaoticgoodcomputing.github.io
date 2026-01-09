import { Annotation } from "./types"

/**
 * Render highlights for an annotation's quoted text
 * Uses page-width bars covering the approximate vertical space
 */
export function renderHighlights(annotation: Annotation): void {
  // Clear existing highlights
  document.querySelectorAll(".pdf-text-highlight").forEach((el) => el.remove())

  if (!annotation.target || annotation.target.length === 0) return

  // Find TextPositionSelector
  const positionSelector = annotation.target.find((t) =>
    t.selector?.some((s) => s.type === "TextPositionSelector"),
  )
  if (!positionSelector) return

  const textPositionSelector = positionSelector.selector?.find(
    (s) => s.type === "TextPositionSelector",
  )
  if (!textPositionSelector) return

  const startOffset = textPositionSelector.start
  const endOffset = textPositionSelector.end
  const textLength = endOffset! - startOffset!
  const pdfTextData = window.pdfTextData
  const container = document.querySelector("#pdf-viewer")

  if (!pdfTextData || !container) return

  // Find the page where the annotation starts
  const pageData = pdfTextData.find(
    (p) => startOffset! >= p.startOffset && startOffset! < p.endOffset,
  )
  if (!pageData) return

  // Get the starting position
  const pageStartOffset = startOffset! - pageData.startOffset
  const startPos = pageData.positions[pageStartOffset]
  if (!startPos) return

  // Get highlight layer for this page
  const pageWrapper = container.querySelector(
    `.pdf-page-wrapper[data-page-num="${pageData.pageNum}"]`,
  )
  const highlightLayer = pageWrapper?.querySelector(".pdf-highlight-layer")
  const canvas = pageWrapper?.querySelector(".pdf-page")
  if (!highlightLayer || !canvas) return

  // Get the actual canvas dimensions and position
  const canvasRect = canvas.getBoundingClientRect()
  const layerRect = highlightLayer.getBoundingClientRect()

  // Calculate offset to match canvas centering
  const leftOffset = canvasRect.left - layerRect.left

  // Estimate height based on text length
  // Assume approximately 80 characters per line, 12px line height
  const estimatedLines = Math.ceil(textLength / 80)
  const lineHeight = 12
  const highlightHeight = estimatedLines * lineHeight * 1.5 // Add some padding

  // Create a page-width highlight bar matching canvas centering
  const highlight = document.createElement("div")
  highlight.className = "pdf-text-highlight"
  highlight.style.left = leftOffset + "px"
  highlight.style.top = pageData.viewport.height - startPos.y + 9 * lineHeight + "px"
  highlight.style.width = canvasRect.width + "px"
  highlight.style.height = highlightHeight + "px"
  highlightLayer.appendChild(highlight)
}
