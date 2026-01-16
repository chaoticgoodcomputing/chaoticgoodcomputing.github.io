(async () => {
  // Check if PDF viewers exist on the page before loading resources
  const viewers = document.querySelectorAll(".widget-pdf-viewer")
  if (viewers.length === 0) return

  // Load PDF.js viewer CSS from CDN and scope it to .widget-pdf-viewer
  // This prevents PDF.js's bare selectors from affecting the rest of the page
  if (!document.querySelector('style[data-pdf-viewer-scoped-css]')) {
    try {
      const response = await fetch("https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/web/pdf_viewer.min.css")
      const originalCss = await response.text()
      
      // Scope all CSS rules to .widget-pdf-viewer
      // This regex matches CSS selectors and prefixes them with .widget-pdf-viewer
      const scopedCss = originalCss.replace(
        /([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g,
        (match, selector, separator) => {
          // Skip @-rules (like @media, @keyframes, @font-face)
          if (selector.trim().startsWith('@')) return match
          
          // Skip :root and html/body selectors
          if (selector.trim().match(/^(:root|html|body)\s*$/)) return match
          
          // Scope the selector
          return `.widget-pdf-viewer ${selector}${separator}`
        }
      )
      
      const styleTag = document.createElement("style")
      styleTag.setAttribute("data-pdf-viewer-scoped-css", "true")
      styleTag.textContent = scopedCss
      document.head.appendChild(styleTag)
    } catch (error) {
      console.error("Failed to load and scope PDF.js CSS:", error)
      // Fallback to unscoped CSS if scoping fails
      const viewerCss = document.createElement("link")
      viewerCss.rel = "stylesheet"
      viewerCss.href = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/web/pdf_viewer.min.css"
      document.head.appendChild(viewerCss)
    }
  }

  // Load PDF.js core library from CDN (no viewer components needed)
  const pdfjsScript = document.createElement("script")
  pdfjsScript.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.min.mjs"
  pdfjsScript.type = "module"
  document.head.appendChild(pdfjsScript)

  // Wait for script to load
  await new Promise((resolve) => { pdfjsScript.onload = resolve })

  // @ts-ignore - pdfjsLib is loaded from CDN
  const pdfjsLib = window.pdfjsLib

  // Configure PDF.js worker to use the CDN version
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs"

  interface PDFViewerElement extends HTMLElement {
    dataset: {
      src: string
      title: string
      dpi: string
      initialized?: string
    }
  }

/**
   * Initialize a single PDF viewer using PDFPageView components
   */
  async function initPDFViewer(container: PDFViewerElement): Promise<void> {
    const src = container.dataset.src
    const title = container.dataset.title || "PDF Document"

    const canvasContainer = container.querySelector(".pdf-viewer-canvas-container") as HTMLElement
    if (!canvasContainer) return

    try {
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument(src)
      const pdf = await loadingTask.promise

      // Clear loading message
      canvasContainer.innerHTML = ""

      // Update toolbar with page count
      const infoElement = container.querySelector(".pdf-viewer-info")
      if (infoElement) {
        infoElement.innerHTML = `
          <span class="pdf-viewer-filename">${title}</span>
          <span style="color: var(--gray)">•</span>
          <span>${pdf.numPages} page${pdf.numPages !== 1 ? "s" : ""}</span>
        `
      }

      // Create event bus for PDF.js viewer components
      // const eventBus = new pdfjsViewer.EventBus()

      // Create link service for handling annotations
      // const linkService = new pdfjsViewer.SimpleLinkService({ eventBus })

      // Calculate the available width for the PDF (accounting for padding)
      const containerWidth = canvasContainer.clientWidth - 32 // 1rem padding on each side

      // Render all pages manually using core API
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)

        // Get natural page dimensions
        const naturalViewport = page.getViewport({ scale: 1.0 })
        
        // Calculate scale to fit width
        const scale = containerWidth / naturalViewport.width
        const viewport = page.getViewport({ scale })

        // Create page container
        const pageContainer = document.createElement("div")
        pageContainer.className = "pdf-viewer-page-container"
        pageContainer.style.position = "relative"
        pageContainer.style.width = `${viewport.width}px`
        pageContainer.style.height = `${viewport.height}px`
        
        // Create canvas
        const canvas = document.createElement("canvas")
        canvas.className = "pdf-canvas"
        const context = canvas.getContext("2d")!
        
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        pageContainer.appendChild(canvas)
        
        // Create text layer container
        const textLayerDiv = document.createElement("div")
        textLayerDiv.className = "textLayer"
        pageContainer.appendChild(textLayerDiv)
        
        canvasContainer.appendChild(pageContainer)

        // Render the page canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise
        
        // Render the text layer for selection and links
        try {
          const textContent = await page.getTextContent()
          
          // Check if TextLayer is available
          if (pdfjsLib.TextLayer) {
            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport: viewport,
            })
            await textLayer.render()
          }
        } catch (textError) {
          console.warn("Could not render text layer:", textError)
        }
        
        // Render annotation layer for hyperlinks and interactive elements
        try {
          const annotations = await page.getAnnotations()
          
          if (annotations.length > 0) {
            const annotationLayerDiv = document.createElement("div")
            annotationLayerDiv.className = "annotationLayer"
            pageContainer.appendChild(annotationLayerDiv)
            
            // Render annotations manually since core build doesn't have AnnotationLayer.render
            for (const annotation of annotations) {
              if (annotation.subtype === "Link" && annotation.url) {
                const link = document.createElement("a")
                link.href = annotation.url
                link.target = "_blank"
                link.rel = "noopener noreferrer nofollow"
                link.className = "linkAnnotation"
                
                // Position the link using the annotation rectangle
                const rect = annotation.rect
                if (rect && rect.length === 4) {
                  const [x1, y1, x2, y2] = rect
                  const width = x2 - x1
                  const height = y2 - y1
                  
                  // Transform coordinates to match viewport
                  const transform = viewport.transform
                  const tx = transform[0] * x1 + transform[2] * y1 + transform[4]
                  const ty = transform[1] * x1 + transform[3] * y1 + transform[5]
                  const twidth = transform[0] * width
                  const theight = transform[3] * height
                  
                  link.style.position = "absolute"
                  link.style.left = `${tx}px`
                  link.style.top = `${ty}px`
                  link.style.width = `${Math.abs(twidth)}px`
                  link.style.height = `${Math.abs(theight)}px`
                  link.style.pointerEvents = "auto"
                }
                
                annotationLayerDiv.appendChild(link)
              }
            }
          }
        } catch (annotationError) {
          console.warn("Could not render annotation layer:", annotationError)
        }
      }
    } catch (error) {
      console.error("Error loading PDF:", error)
      canvasContainer.innerHTML = `
        <div class="pdf-viewer-error">
          <div class="pdf-viewer-error-title">Failed to Load PDF</div>
          <div class="pdf-viewer-error-message">${(error as Error).message}</div>
          <a href="${src}" target="_blank" rel="noopener noreferrer">Open PDF in new tab</a>
        </div>
      `
    }
  }

  /**
   * Initialize all PDF viewers on the page
   */
  function initAllPDFViewers(): void {
    const viewers = document.querySelectorAll<PDFViewerElement>(".widget-pdf-viewer")
    viewers.forEach((viewer) => {
      // Check if already initialized
      if (viewer.dataset.initialized === "true") return
      viewer.dataset.initialized = "true"
      initPDFViewer(viewer)
    })
  }

  // Initialize on page load
  document.addEventListener("DOMContentLoaded", initAllPDFViewers)

  // Re-initialize on SPA navigation if enabled
  document.addEventListener("nav", initAllPDFViewers)
  
  // If DOM is already loaded (script loaded after DOMContentLoaded), initialize immediately
  if (document.readyState === "complete" || document.readyState === "interactive") {
    initAllPDFViewers()
  }
})()

export default ""
