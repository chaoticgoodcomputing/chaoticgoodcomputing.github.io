import { WidgetProps, WidgetComponent } from "../types"

interface PDFViewerProps extends WidgetProps {
  src: string
  width?: string
  height?: string
  title?: string
  dpi?: number
}

/**
 * PDFViewer widget - displays a PDF document with download capability.
 * 
 * Renders PDFs using PDF.js with a download button for offline access.
 * 
 * @example
 * ```mdx
 * import { PDFViewer } from '@widgets/pdf-viewer'
 * 
 * <PDFViewer src="/assets/document.pdf" title="My Document" />
 * <PDFViewer src="/assets/document.pdf" title="My Document" dpi={150} />
 * ```
 * 
 * @param src - Path to the PDF file
 * @param title - Title to display in the viewer toolbar
 * @param width - CSS width value (default: "100%")
 * @param height - CSS height value (default: "600px")
 * @param dpi - Rendering DPI (default: 96). Higher values produce sharper text but larger file sizes.
 *              Standard values: 72 (PDF default), 96 (screen), 150 (print quality), 300 (high quality)
 */
export const PDFViewer: WidgetComponent = (props: WidgetProps) => {
  const { src, width = "100%", height = "600px", title = "PDF Document", dpi = 96 } = props as PDFViewerProps

  return (
    <div
      class="widget-pdf-viewer"
      data-src={src}
      data-title={title}
      data-dpi={dpi}
      style={{ width, height }}
    >
      <div class="pdf-viewer-toolbar">
        <div class="pdf-viewer-info">
          <span class="pdf-viewer-filename">{title}</span>
        </div>
        <div class="pdf-viewer-controls">
          <a
            href={src}
            download
            class="pdf-viewer-download-btn no-popover"
            title="Download PDF"
            data-no-popover
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </a>
        </div>
      </div>
      <div class="pdf-viewer-canvas-container">
        <div class="pdf-viewer-loading">
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
    </div>
  )
}
