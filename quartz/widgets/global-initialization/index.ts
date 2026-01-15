import { WidgetDefinition } from "../types"
import { GlobalInitialization } from "./component.tsx"
import script from "./script.inline.ts"

export const globalInitialization: WidgetDefinition = {
  name: "GlobalInitialization",
  Component: GlobalInitialization,
  script: script,
  selector: ".widget-global-initialization",
  scriptName: "global-initialization",
}
