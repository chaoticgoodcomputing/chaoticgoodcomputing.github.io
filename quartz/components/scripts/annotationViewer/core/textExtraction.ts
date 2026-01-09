import { PDFPageData, CharacterPosition, TextPosition } from "./types"

/**
 * Extract text content with character positions from a PDF page
 */
export async function extractPageText(
  page: any,
  pageNum: number,
  scale: number,
  cumulativeOffset: number,
): Promise<PDFPageData> {
  const viewport = page.getViewport({ scale })
  const textContent = await page.getTextContent()
  const pageText = textContent.items.map((item: any) => item.str).join("")

  // Store text positions with bounding boxes for this page
  const pageVerticalPositions: CharacterPosition[] = []
  let charOffset = 0

  textContent.items.forEach((item: any) => {
    const itemLength = item.str.length
    const transform = item.transform
    const fontSize = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3])

    for (let i = 0; i < itemLength; i++) {
      pageVerticalPositions.push({
        char: item.str[i],
        x: transform[4] + i * fontSize * 0.5, // Approximate x position per character
        y: transform[5],
        width: fontSize * 0.6, // Approximate character width
        height: fontSize,
        absoluteOffset: cumulativeOffset + charOffset,
      })
      charOffset++
    }
  })

  return {
    pageNum,
    text: pageText,
    positions: pageVerticalPositions,
    textItems: textContent.items,
    viewport,
    startOffset: cumulativeOffset,
    endOffset: cumulativeOffset + pageText.length,
  }
}

/**
 * Find the position of text in the PDF by character offset
 */
export function findTextPositionInPDF(startChar: number, endChar: number): TextPosition | null {
  if (!window.pdfTextData) return null

  // Find which page contains this text
  const pageData = window.pdfTextData.find(
    (p) => startChar >= p.startOffset && startChar < p.endOffset,
  )

  if (!pageData) {
    console.warn("[PDF] Could not find page for character offset:", startChar)
    return null
  }

  // Find Y position of the start character relative to page
  const relativeOffset = startChar - pageData.startOffset
  const position = pageData.positions[relativeOffset]

  if (!position) {
    console.warn("[PDF] Could not find position for offset:", relativeOffset)
    return null
  }

  // Convert PDF coordinates to canvas pixels
  const yInCanvasPixels = pageData.viewport.height - position.y * window.pdfScale

  // Calculate absolute Y position in the scrollable container
  const pagesBeforeThis = pageData.pageNum - 1
  let absoluteY = yInCanvasPixels

  for (let i = 0; i < pagesBeforeThis; i++) {
    absoluteY += window.pdfTextData[i].viewport.height
  }

  return {
    pageNum: pageData.pageNum,
    y: absoluteY,
    text: pageData.text.substring(relativeOffset, relativeOffset + (endChar - startChar)),
  }
}
