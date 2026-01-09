import { extractPageText } from "../core/textExtraction"
import { loadAnnotationsData } from "../ui/loader"
import { createPageWrapper, renderPageToCanvas } from "../ui/pdfRenderer"
import { setupScrollSync } from "./scrollSync"

/**
 * Initialize the PDF viewer and set up annotation highlighting
 */
export async function initPDFViewer(): Promise<void> {
  const viewer = document.querySelector(".annotation-viewer")
  if (!viewer) return

  const pdfUrl = viewer.getAttribute("data-pdf-url")
  if (!pdfUrl) return

  const container = viewer.querySelector("#pdf-viewer")
  if (!container) return

  // Load annotations data
  loadAnnotationsData()

  try {
    const loadingTask = window.pdfjsLib.getDocument(pdfUrl)
    const pdf = await loadingTask.promise

    container.innerHTML = ""

    // Calculate scale to fit container width
    const firstPage = await pdf.getPage(1)
    const baseViewport = firstPage.getViewport({ scale: 1.0 })
    const containerWidth = (container.parentElement?.clientWidth || 800) - 32 // Account for padding
    const scale = containerWidth / baseViewport.width

    console.log(
      "[PDF] Container width:",
      containerWidth,
      "PDF width:",
      baseViewport.width,
      "Scale:",
      scale,
    )

    // Extract text content for annotation positioning
    const pdfTextData = []
    let cumulativeOffset = 0

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)

      // Extract text with positions
      const pageData = await extractPageText(page, pageNum, scale, cumulativeOffset)
      pdfTextData.push(pageData)
      cumulativeOffset = pageData.endOffset

      // Render page
      const pageWrapper = createPageWrapper(pageNum, pageData.viewport)
      container.appendChild(pageWrapper)

      const canvas = pageWrapper.querySelector("canvas")
      if (canvas) {
        await renderPageToCanvas(page, canvas, pageData.viewport)
      }
    }

    console.log("[PDF] Extracted text length:", cumulativeOffset)
    console.log("[PDF] Pages:", pdfTextData.length)

    // Store for annotation positioning
    window.pdfTextData = pdfTextData
    window.pdfScale = scale

    setupScrollSync(viewer)
  } catch (error) {
    console.error("Error loading PDF:", error)
    container.innerHTML = `<div class="pdf-error">Failed to load PDF: ${(error as Error).message}</div>`
  }
}
