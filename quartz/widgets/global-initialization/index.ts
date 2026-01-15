import { WidgetDefinition } from "../types"
import { GlobalInitialization } from "./component.tsx"
import script from "./script.inline.ts"
import css from "./style.inline.scss"

export const globalInitialization: WidgetDefinition = {
  name: "GlobalInitialization",
  Component: GlobalInitialization,
  script: script,
  css: css,
  selector: ".widget-global-initialization",
  scriptName: "global-initialization",
}
