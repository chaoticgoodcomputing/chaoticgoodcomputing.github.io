import { Greeting } from "./component.tsx"
import script from "./script.inline.ts"

// Import types from the global widget system
import type { WidgetDefinition } from "../../../../quartz/widgets/types"

export const greeting: WidgetDefinition = {
  name: "Greeting",
  Component: Greeting,
  script: script,
  selector: ".widget-greeting",
  scriptName: "greeting",
}
