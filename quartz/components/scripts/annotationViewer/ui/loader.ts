/**
 * Load PDF.js library from CDN
 */
export function loadPDFLib(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"
    script.async = true
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
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
