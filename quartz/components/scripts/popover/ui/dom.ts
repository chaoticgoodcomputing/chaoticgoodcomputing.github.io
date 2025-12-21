export function createImageContent(targetUrl: URL): HTMLImageElement {
  const img = document.createElement("img")
  img.src = targetUrl.toString()
  img.alt = targetUrl.pathname
  return img
}

export function createPdfContent(targetUrl: URL): HTMLIFrameElement {
  const pdf = document.createElement("iframe")
  pdf.src = targetUrl.toString()
  return pdf
}

export function createPopoverElement(popoverId: string): {
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
