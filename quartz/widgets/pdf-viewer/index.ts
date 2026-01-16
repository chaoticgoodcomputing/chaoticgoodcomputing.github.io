import { WidgetDefinition } from "../types"
import { PDFViewer } from "./component"
import script from "./script.inline"
import style from "./style.inline.scss"

export const pdfViewer: WidgetDefinition = {
  Component: PDFViewer,
  script: script,
  css: style,
  selector: ".widget-pdf-viewer",
  scriptName: "pdf-viewer",
}
