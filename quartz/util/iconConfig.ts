/**
 * Centralized icon configuration for tags.
 * 
 * This configuration maps tags to icon identifiers. The order of entries
 * determines priority when a node has multiple tags with icons - the first
 * matching tag in the map will be used.
 * 
 * Icon identifiers use the format: "provider:icon-name"
 * Supported providers:
 * - mdi: Material Design Icons (e.g., "mdi:lock")
 * 
 * Usage in other components:
 * 1. Import this config
 * 2. Use getIconForTags() from iconHelpers.ts to determine which icon to use
 * 3. Use IconService to fetch and render the icon
 */

export interface TagIconConfig {
  /** Tag name (matches frontmatter tags, e.g., "private", "engineering/languages/python") */
  tag: string
  /** Icon identifier in format "provider:icon-name" */
  icon: string
}

/**
 * Tag-to-icon mappings.
 * Order matters: first matching tag gets priority when a post has multiple tagged icons.
 */
export const TAG_ICON_CONFIG: TagIconConfig[] = [
  // Access/Privacy
  { tag: "private", icon: "mdi:lock" },
  
  // Programming Languages & Technologies
  { tag: "engineering/languages/python", icon: "mdi:language-python" },
  { tag: "engineering/languages/typescript", icon: "mdi:language-typescript" },
  { tag: "engineering/languages/csharp", icon: "mdi:language-csharp" },
  { tag: "engineering/languages/lua", icon: "mdi:language-lua" },
  { tag: "engineering/languages/scratch", icon: "mdi:cat" },

  { tag: "engineering/bio", icon: "mdi:molecule" },
  { tag: "engineering/languages", icon: "mdi:code-braces" },
  { tag: "engineering/data", icon: "mdi:database" },
  { tag: "engineering/devops", icon: "mdi:truck" },
  { tag: "engineering/frontend", icon: "mdi:palette" },

  { tag: "projects/roblox", icon: "custom:roblox" },
  { tag: "projects/homelab", icon: "mdi:flask-outline" },
  { tag: "projects/college", icon: "mdi:school" },
  { tag: "projects/teaching", icon: "mdi:school" },

  { tag: "projects/flowthru", icon: "mdi:graph-outline" },
  { tag: "projects/magic-atlas", icon: "mdi:cards-outline" },

  { tag: "economics/strategy", icon: "mdi:arrow-decision" },
  { tag: "economics/finance", icon: "mdi:currency-usd" },
  { tag: "economics/markets", icon: "mdi:handshake" },

  { tag: "articles/tutorials", icon: "mdi:information" },

  { tag: "seasons/rhythm", icon: "mdi:music-note-sixteenth" },
  { tag: "seasons/systems", icon: "mdi:robot" },
  
  // General Categories
  { tag: "seasons", icon: "mdi:weather-sunny" },
  { tag: "articles", icon: "mdi:pencil" },
  { tag: "engineering", icon: "mdi:tools" },
  { tag: "economics", icon: "mdi:chart-bell-curve" },
  { tag: "horticulture", icon: "mdi:flower" },
  { tag: "season", icon: "mdi:flower" },
  { tag: "projects", icon: "mdi:folder-cog" },
  { tag: "annotations", icon: "mdi:file-edit" },
]

/**
 * Build a Map for fast icon lookups.
 */
export function getTagIconMap(): Map<string, string> {
  return new Map(TAG_ICON_CONFIG.map(({ tag, icon }) => [tag, icon]))
}
