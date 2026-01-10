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
export const TAG_ICON_CONFIG: TagIconConfig[] = [ ]

/**
 * Build a Map for fast icon lookups.
 */
export function getTagIconMap(): Map<string, string> {
  return new Map(TAG_ICON_CONFIG.map(({ tag, icon }) => [tag, icon]))
}
