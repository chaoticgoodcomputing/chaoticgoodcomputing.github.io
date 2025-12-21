/**
 * Helper utilities for working with icons in various components.
 * 
 * These functions bridge the gap between tag data and icon rendering,
 * respecting the priority order defined in iconConfig.ts.
 */

import { TAG_ICON_CONFIG, getTagIconMap } from "./iconConfig"

/**
 * Determine which icon to use for a given set of tags.
 * 
 * When multiple tags have icons configured, the first tag in the
 * TAG_ICON_CONFIG array that appears in the provided tags will be used.
 * This respects the priority order defined in the configuration.
 * 
 * @param tags - Array of tag strings (e.g., ["private", "engineering/languages/python"])
 * @returns Icon identifier (e.g., "mdi:lock"), or null if no icon configured
 * 
 * @example
 * ```ts
 * // Given TAG_ICON_CONFIG = [
 * //   { tag: "private", icon: "mdi:lock" },
 * //   { tag: "engineering/languages/python", icon: "mdi:language-python" }
 * // ]
 * 
 * getIconForTags(["engineering/languages/python", "private"])
 * // Returns: "mdi:lock" (private has higher priority)
 * 
 * getIconForTags(["engineering/languages/python"])
 * // Returns: "mdi:language-python"
 * 
 * getIconForTags(["untagged"])
 * // Returns: null
 * ```
 */
export function getIconForTags(tags: string[]): string | null {
  if (!tags || tags.length === 0) return null
  
  // Iterate through config in order (priority)
  for (const { tag, icon } of TAG_ICON_CONFIG) {
    if (tags.includes(tag)) {
      return icon
    }
  }
  
  return null
}

/**
 * Get all icon identifiers that should be preloaded.
 * Useful for preloading all configured icons at application startup.
 * 
 * @returns Array of unique icon identifiers
 */
export function getAllConfiguredIcons(): string[] {
  const icons = new Set(TAG_ICON_CONFIG.map((config) => config.icon))
  return Array.from(icons)
}

/**
 * Check if a specific tag has an icon configured.
 * 
 * @param tag - Tag string to check
 * @returns True if the tag has an icon configured
 */
export function hasIconForTag(tag: string): boolean {
  const iconMap = getTagIconMap()
  return iconMap.has(tag)
}

/**
 * Get the icon identifier for a specific tag.
 * 
 * @param tag - Tag string
 * @returns Icon identifier, or null if not configured
 */
export function getIconForTag(tag: string): string | null {
  const iconMap = getTagIconMap()
  return iconMap.get(tag) ?? null
}
