/**
 * Client-side script for PDF viewer widget.
 * This script finds all .widget-pdf-viewer containers and initializes them.
 * 
 * This is a minimal example implementation. In production, you might use
 * a library like PDF.js for full PDF rendering capabilities.
 */

interface PDFViewerElement extends HTMLElement {
  dataset: {
    src: string
    page: string
  }
}

function initPDFViewer(container: PDFViewerElement) {
  const src = container.dataset.src
  const page = parseInt(container.dataset.page || "1", 10)

  // Clear loading message
  container.innerHTML = ""

  // Create iframe to display PDF
  // Note: This is a simple implementation. For production, consider using PDF.js
  const iframe = document.createElement("iframe")
  iframe.src = `${src}#page=${page}`
  iframe.style.width = "100%"
  iframe.style.height = "100%"
  iframe.style.border = "none"
  iframe.title = "PDF Viewer"

  container.appendChild(iframe)
}

function initAllPDFViewers() {
  const viewers = document.querySelectorAll<PDFViewerElement>(".widget-pdf-viewer")
  viewers.forEach(initPDFViewer)
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", initAllPDFViewers)

// Re-initialize on SPA navigation if enabled
document.addEventListener("nav", initAllPDFViewers)
