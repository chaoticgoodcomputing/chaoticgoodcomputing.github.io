import { WidgetDefinition } from "../types"
import { PDFViewerPlaceholder } from "./component.tsx"
import script from "./script.inline.ts"

export const pdfViewer: WidgetDefinition = {
  name: "PDFViewer",
  Component: PDFViewerPlaceholder,
  script: script,
  selector: ".widget-pdf-viewer",
  scriptName: "pdf-viewer",
}
