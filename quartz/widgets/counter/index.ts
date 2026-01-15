import { WidgetDefinition } from "../types"
import { Counter } from "./component.tsx"
import script from "./script.inline.ts"

export const counter: WidgetDefinition = {
  name: "Counter",
  Component: Counter,
  script: script,
  selector: ".widget-counter",
  scriptName: "counter",
}
