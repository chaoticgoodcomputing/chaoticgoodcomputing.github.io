import { WidgetDefinition } from "../types"
import { InitCheck } from "./component"
import script from "./script.inline.ts"

export const initCheck: WidgetDefinition = {
  name: "InitCheck",
  Component: InitCheck,
  script: script,
  selector: ".widget-init-check",
  scriptName: "init-check",
}
