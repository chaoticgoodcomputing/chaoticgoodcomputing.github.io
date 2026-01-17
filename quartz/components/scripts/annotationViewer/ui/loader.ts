/**
 * Load PDF.js library from CDN
 */
export async function loadPDFLib(): Promise<void> {
  // Load PDF.js viewer CSS from CDN and scope it to .annotation-viewer
  // This prevents PDF.js's bare selectors from affecting the rest of the page
  if (!document.querySelector('style[data-annotation-viewer-scoped-css]')) {
    try {
      const response = await fetch("https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/web/pdf_viewer.min.css")
      const originalCss = await response.text()
      
      // Scope all CSS rules to .annotation-viewer
      const scopedCss = originalCss.replace(
        /([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g,
        (match, selector, separator) => {
          // Skip @-rules (like @media, @keyframes, @font-face)
          if (selector.trim().startsWith('@')) return match
          
          // Skip :root and html/body selectors
          if (selector.trim().match(/^(:root|html|body)\s*$/)) return match
          
          // Scope the selector
          return `.annotation-viewer ${selector}${separator}`
        }
      )
      
      const styleTag = document.createElement("style")
      styleTag.setAttribute("data-annotation-viewer-scoped-css", "true")
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

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.min.mjs"
    script.type = "module"
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs"
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * Load annotations data from embedded script tag
 */
export function loadAnnotationsData(): void {
  const annotationsScript = document.getElementById("annotations-data")
  if (annotationsScript) {
    try {
      window.annotationsData = JSON.parse(annotationsScript.textContent || "[]")
      console.log("[Annotations] Loaded", window.annotationsData.length, "annotations")
    } catch (e) {
      console.error("[Annotations] Failed to parse annotations data:", e)
    }
  }
}
