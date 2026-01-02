import { SharedLayout } from "../cfg"
import * as Component from "../components"

/**
 * Shared components that appear across all page types.
 * This includes the head, header, footer, and afterBody sections.
 */
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jackyzha0/quartz",
      "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}
