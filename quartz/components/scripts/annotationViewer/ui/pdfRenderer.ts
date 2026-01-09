/**
 * Create a canvas wrapper with highlight layer for a PDF page
 */
export function createPageWrapper(pageNum: number, viewport: any): HTMLDivElement {
  const pageWrapper = document.createElement("div")
  pageWrapper.className = "pdf-page-wrapper"
  pageWrapper.setAttribute("data-page-num", pageNum.toString())

  const canvas = document.createElement("canvas")
  canvas.className = "pdf-page"
  canvas.setAttribute("data-page-num", pageNum.toString())
  canvas.height = viewport.height
  canvas.width = viewport.width
  canvas.style.display = "block"

  // Create highlight overlay
  const highlightLayer = document.createElement("div")
  highlightLayer.className = "pdf-highlight-layer"
  highlightLayer.style.width = viewport.width + "px"
  highlightLayer.style.height = viewport.height + "px"

  pageWrapper.appendChild(canvas)
  pageWrapper.appendChild(highlightLayer)

  return pageWrapper
}

/**
 * Render a PDF page to canvas
 */
export async function renderPageToCanvas(
  page: any,
  canvas: HTMLCanvasElement,
  viewport: any,
): Promise<void> {
  const context = canvas.getContext("2d")
  if (!context) return
  await page.render({ canvasContext: context, viewport: viewport }).promise
}
