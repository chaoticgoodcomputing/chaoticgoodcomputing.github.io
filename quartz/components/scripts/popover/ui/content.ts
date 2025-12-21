import { normalizeRelativeURLs } from "../../../../util/path"
import { createImageContent, createPdfContent } from "./dom"

async function createHtmlContent(
  domParser: DOMParser,
  response: Response,
  targetUrl: URL,
): Promise<HTMLElement[] | null> {
  const contents = await response.text()
  const html = domParser.parseFromString(contents, "text/html")
  normalizeRelativeURLs(html, targetUrl)

  html.querySelectorAll("[id]").forEach((el) => {
    const targetID = `popover-internal-${el.id}`
    el.id = targetID
  })

  const elts = [...html.getElementsByClassName("popover-hint")]
  if (elts.length === 0) return null
  return elts as HTMLElement[]
}

export async function populatePopoverContent(
  domParser: DOMParser,
  popoverInner: HTMLDivElement,
  response: Response,
  targetUrl: URL,
): Promise<boolean> {
  const [contentType] = response.headers.get("Content-Type")!.split(";")
  const [contentTypeCategory, typeInfo] = contentType.split("/")

  popoverInner.dataset.contentType = contentType ?? undefined

  switch (contentTypeCategory) {
    case "image":
      popoverInner.appendChild(createImageContent(targetUrl))
      return true

    case "application":
      if (typeInfo === "pdf") {
        popoverInner.appendChild(createPdfContent(targetUrl))
        return true
      }
      return false

    default: {
      const elements = await createHtmlContent(domParser, response, targetUrl)
      if (!elements) return false
      elements.forEach((elt) => popoverInner.appendChild(elt))
      return true
    }
  }
}
