import { loadPDFLib } from "./ui/loader"
import { initPDFViewer } from "./adapters/lifecycle"
import { renderHighlights } from "./core/highlighting"

// Load PDF.js library and initialize viewer
loadPDFLib().then(() => {
  initPDFViewer()
})

// Expose renderHighlights globally for interactive use
window.renderHighlights = renderHighlights
