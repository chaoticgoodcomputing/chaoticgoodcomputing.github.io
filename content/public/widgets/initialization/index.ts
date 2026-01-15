import { Initialization } from "./component.tsx"
import script from "./script.inline.ts"

// Import types from the global widget system
import type { WidgetDefinition } from "../../../../quartz/widgets/types"

export const initialization: WidgetDefinition = {
  name: "Initialization",
  Component: Initialization,
  script: script,
  selector: ".widget-content-initialization",
  scriptName: "initialization",
}
