import { WidgetDefinition, WidgetProps } from "../types"
// @ts-ignore
import script from "./script.inline"

interface PDFViewerProps extends WidgetProps {
  src: string
  page?: number
  width?: string
  height?: string
}

/**
 * Static placeholder component rendered at build time.
 * Renders a container that the client script will hydrate into a PDF viewer.
 */
export function PDFViewerPlaceholder(props: PDFViewerProps) {
  const { src, page = 1, width = "100%", height = "600px" } = props

  return (
    <div
      class="widget-pdf-viewer"
      data-src={src}
      data-page={page.toString()}
      style={{width, height}}
    >
      <div class="pdf-loading">
        Loading PDF viewer...
        <noscript>
          <p>
            <a href={src} target="_blank" rel="noopener noreferrer">
              Open PDF in new tab
            </a>
          </p>
        </noscript>
      </div>
    </div>
  )
}

/**
 * Widget definition for registration in the widget registry.
 */
export const pdfViewer: WidgetDefinition = {
  Component: PDFViewerPlaceholder,
  script,
  selector: ".widget-pdf-viewer",
  scriptName: "pdf-viewer",
}
