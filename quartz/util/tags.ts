/**
 * Centralized tag utilities for the Quartz tag system.
 * 
 * This module provides isomorphic utilities (work on both server and client)
 * for working with tags throughout Quartz. Tags support hierarchical organization
 * (parent/child relationships), colors, and icons.
 * 
 * Key concepts:
 * - Tags are normalized (no trailing slashes)
 * - Tags use "/" as hierarchy separator (e.g., "engineering/languages/python")
 * - Colors and icons inherit from parent tags if not explicitly assigned
 * - Tag slugs follow pattern "tags/{tag}" (e.g., "tags/engineering/languages/python")
 */

import { FullSlug } from "./path"
import type { TagColorConfig, TagIconConfig } from "../cfg"
import type { QuartzPluginData } from "../plugins/vfile"

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Complete metadata for a single tag, including hierarchy and presentation.
 */
export interface TagMetadata {
  /** Normalized tag name (e.g., "engineering/languages/python") */
  tag: string
  
  /** Slug for the tag's index page (e.g., "tags/engineering/languages/python") */
  slug: FullSlug
  
  /** Assigned color (may be inherited from parent) */
  color: string
  
  /** Icon identifier if configured (e.g., "mdi:language-python") */
  icon: string | null
  
  /** Immediate parent tag, or null if top-level */
  parent: string | null
  
  /** Direct children tags */
  children: string[]
  
  /** All ancestor tags up to root */
  ancestors: string[]
  
  /** All descendant tags (recursive) */
  descendants: string[]
  
  /** Hierarchy depth (0 for top-level, 1 for one slash, etc.) */
  depth: number
  
  /** Number of posts with this exact tag */
  postCount: number
  
  /** Total posts including descendants */
  totalPostCount: number
}

/**
 * Complete tag index structure emitted by TagIndex plugin.
 */
export interface TagIndex {
  /** Map of tag name to metadata */
  tags: { [tag: string]: TagMetadata }
  
  /** List of top-level tags */
  topLevelTags: string[]
  
  /** List of all tags in the system */
  allTags: string[]
  
  /** Icon config order for priority-based selection (first match wins) */
  iconConfigOrder: string[]
}

// ============================================================================
// Tag Normalization
// ============================================================================

/**
 * Normalize a tag by removing trailing slashes and extra whitespace.
 * 
 * @param tag - Raw tag string
 * @returns Normalized tag string
 * 
 * @example
 * normalizeTag("engineering/languages/")  // => "engineering/languages"
 * normalizeTag(" python ")                 // => "python"
 */
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\/+$/, "")
}

/**
 * Convert a tag to its corresponding slug (tag index page path).
 * 
 * @param tag - Normalized tag name
 * @returns Full slug for the tag's index page
 * 
 * @example
 * tagToSlug("engineering/languages")  // => "tags/engineering/languages"
 */
export function tagToSlug(tag: string): FullSlug {
  const normalized = normalizeTag(tag)
  return `tags/${normalized}` as FullSlug
}

/**
 * Extract tag name from a tag page slug.
 * Returns null if the slug is not a tag page.
 * 
 * @param slug - Full slug to parse
 * @returns Tag name, or null if not a tag page
 * 
 * @example
 * slugToTag("tags/engineering/languages")       // => "engineering/languages"
 * slugToTag("tags/engineering/languages/index") // => "engineering/languages"
 * slugToTag("content/article")                  // => null
 */
export function slugToTag(slug: FullSlug): string | null {
  if (!slug.startsWith("tags/")) {
    return null
  }
  
  let tag = slug.replace(/^tags\//, "")
  // Remove /index suffix if present
  tag = tag.replace(/\/index$/, "")
  
  return normalizeTag(tag)
}

/**
 * Check if a slug represents a tag index page.
 * 
 * @param slug - Slug to check
 * @returns True if this is a tag page
 */
export function isTagPage(slug: FullSlug): boolean {
  return slug === "tags" || slug.startsWith("tags/")
}

/**
 * Get the current tag from a tag page slug.
 * For the root "tags" page, returns null.
 * 
 * @param slug - Tag page slug
 * @returns Current tag, or null if root tags page
 * 
 * @example
 * getCurrentTagFromSlug("tags/engineering/languages")  // => "engineering/languages"
 * getCurrentTagFromSlug("tags")                        // => null
 */
export function getCurrentTagFromSlug(slug: FullSlug): string | null {
  if (slug === "tags") {
    return null
  }
  return slugToTag(slug)
}

// ============================================================================
// Tag Hierarchy
// ============================================================================

/**
 * Get the immediate parent of a tag.
 * Returns null for top-level tags.
 * 
 * @param tag - Tag name
 * @returns Parent tag, or null if top-level
 * 
 * @example
 * getParentTag("engineering/languages/python")  // => "engineering/languages"
 * getParentTag("engineering")                   // => null
 */
export function getParentTag(tag: string): string | null {
  const normalized = normalizeTag(tag)
  const lastSlash = normalized.lastIndexOf("/")
  
  if (lastSlash === -1) {
    return null
  }
  
  return normalized.substring(0, lastSlash)
}

/**
 * Get all ancestor tags (parent, grandparent, etc.) up to the root.
 * Returns in order from immediate parent to root.
 * 
 * @param tag - Tag name
 * @returns Array of ancestor tags
 * 
 * @example
 * getAllAncestors("engineering/languages/python")
 * // => ["engineering/languages", "engineering"]
 */
export function getAllAncestors(tag: string): string[] {
  const ancestors: string[] = []
  let current = getParentTag(tag)
  
  while (current !== null) {
    ancestors.push(current)
    current = getParentTag(current)
  }
  
  return ancestors
}

/**
 * Get the top-level tag (root ancestor) for any tag.
 * 
 * @param tag - Tag name
 * @returns Top-level tag
 * 
 * @example
 * getTopLevelTag("engineering/languages/python")  // => "engineering"
 * getTopLevelTag("horticulture")                  // => "horticulture"
 */
export function getTopLevelTag(tag: string): string {
  const normalized = normalizeTag(tag)
  const firstSlash = normalized.indexOf("/")
  
  if (firstSlash === -1) {
    return normalized
  }
  
  return normalized.substring(0, firstSlash)
}

/**
 * Get the hierarchy depth of a tag (number of slashes).
 * 
 * @param tag - Tag name
 * @returns Depth (0 for top-level)
 * 
 * @example
 * getTagDepth("engineering")                   // => 0
 * getTagDepth("engineering/languages")         // => 1
 * getTagDepth("engineering/languages/python")  // => 2
 */
export function getTagDepth(tag: string): number {
  const normalized = normalizeTag(tag)
  if (normalized === "") return 0
  return (normalized.match(/\//g) || []).length
}

/**
 * Get direct children of a tag from a list of all tags.
 * 
 * @param tag - Parent tag
 * @param allTags - All tags in the system
 * @returns Array of direct child tags
 * 
 * @example
 * getChildTags("engineering", ["engineering", "engineering/languages", "engineering/languages/python"])
 * // => ["engineering/languages"]
 */
export function getChildTags(tag: string, allTags: string[]): string[] {
  const normalized = normalizeTag(tag)
  const prefix = normalized + "/"
  const children: string[] = []
  
  for (const otherTag of allTags) {
    if (otherTag.startsWith(prefix)) {
      const remainder = otherTag.substring(prefix.length)
      // Only direct children (no additional slashes)
      if (remainder.length > 0 && !remainder.includes("/")) {
        children.push(otherTag)
      }
    }
  }
  
  return children
}

/**
 * Get all descendants of a tag (recursive children).
 * 
 * @param tag - Parent tag
 * @param allTags - All tags in the system
 * @returns Array of all descendant tags
 * 
 * @example
 * getAllDescendants("engineering", ["engineering", "engineering/languages", "engineering/languages/python"])
 * // => ["engineering/languages", "engineering/languages/python"]
 */
export function getAllDescendants(tag: string, allTags: string[]): string[] {
  const normalized = normalizeTag(tag)
  const prefix = normalized + "/"
  
  return allTags.filter(t => t.startsWith(prefix))
}

/**
 * Check if one tag is a descendant of another.
 * 
 * @param tag - Potential descendant tag
 * @param ancestor - Potential ancestor tag
 * @returns True if tag is a descendant of ancestor
 */
export function isDescendantOf(tag: string, ancestor: string): boolean {
  const normalizedTag = normalizeTag(tag)
  const normalizedAncestor = normalizeTag(ancestor)
  
  if (normalizedTag === normalizedAncestor) {
    return false
  }
  
  return normalizedTag.startsWith(normalizedAncestor + "/")
}

/**
 * Check if a file's tags match a filter tag (exact or descendant match).
 * Useful for filtering posts by tag hierarchy.
 * 
 * @param fileTags - Tags from a file's frontmatter
 * @param filterTag - Tag to filter by
 * @param includeDescendants - Whether to include posts with descendant tags
 * @returns True if file matches the filter
 * 
 * @example
 * matchesTagFilter(["engineering/languages/python"], "engineering", true)      // => true
 * matchesTagFilter(["engineering/languages/python"], "engineering", false)     // => false
 * matchesTagFilter(["engineering/languages/python"], "engineering/languages", true) // => true
 */
export function matchesTagFilter(
  fileTags: string[],
  filterTag: string,
  includeDescendants: boolean = false
): boolean {
  const normalizedFilter = normalizeTag(filterTag)
  const normalizedFileTags = fileTags.map(normalizeTag)
  
  if (normalizedFileTags.includes(normalizedFilter)) {
    return true
  }
  
  if (includeDescendants) {
    return normalizedFileTags.some(tag => isDescendantOf(tag, normalizedFilter))
  }
  
  return false
}

// ============================================================================
// Color and Icon Resolution
// ============================================================================

/**
 * Get the color for a tag, with parent fallback.
 * Searches the tag, then ancestors, then default.
 * 
 * @param tag - Tag name
 * @param colorConfig - Color configuration array
 * @param defaultColor - Fallback color
 * @returns Resolved color (hex string)
 */
export function getColorForTag(
  tag: string,
  colorConfig: TagColorConfig[],
  defaultColor: string = "#888888"
): string {
  const normalized = normalizeTag(tag)
  
  // Check exact match
  for (const config of colorConfig) {
    if (normalizeTag(config.tag) === normalized) {
      return config.color
    }
  }
  
  // Check ancestors
  const ancestors = getAllAncestors(normalized)
  for (const ancestor of ancestors) {
    for (const config of colorConfig) {
      if (normalizeTag(config.tag) === ancestor) {
        return config.color
      }
    }
  }
  
  return defaultColor
}

/**
 * Get the icon for a tag (exact match only, no inheritance).
 * Uses priority-based matching (first match wins).
 * 
 * @param tag - Tag name
 * @param iconConfig - Icon configuration array
 * @param defaultIcon - Fallback icon
 * @returns Icon identifier or null
 */
export function getIconForTag(
  tag: string,
  iconConfig: TagIconConfig[],
  defaultIcon: string | null = null
): string | null {
  const normalized = normalizeTag(tag)
  
  for (const config of iconConfig) {
    if (normalizeTag(config.tag) === normalized) {
      return config.icon
    }
  }
  
  return defaultIcon
}

/**
 * Get the icon for a set of tags (priority-based selection).
 * Returns the icon of the first tag in iconConfig that appears in the tags array.
 * 
 * @param tags - Array of tags
 * @param iconConfig - Icon configuration array
 * @param defaultIcon - Fallback icon
 * @returns Icon identifier or null
 */
export function getIconForTags(
  tags: string[],
  iconConfig: TagIconConfig[],
  defaultIcon: string | null = null
): string | null {
  if (!tags || tags.length === 0) return defaultIcon
  
  const normalizedTags = tags.map(normalizeTag)
  
  // Iterate through config in order (priority)
  for (const config of iconConfig) {
    const normalizedConfigTag = normalizeTag(config.tag)
    if (normalizedTags.includes(normalizedConfigTag)) {
      return config.icon
    }
  }
  
  return defaultIcon
}

// ============================================================================
// File/Tag Relationships
// ============================================================================

/**
 * Safely extract tags from a file's frontmatter.
 * 
 * @param file - File data
 * @returns Array of normalized tags
 */
export function getTagsForFile(file: QuartzPluginData): string[] {
  const tags = file.frontmatter?.tags ?? []
  return tags.map(normalizeTag)
}

/**
 * Calculate tag counts (posts per tag).
 * 
 * @param files - Array of all files
 * @param cumulative - Whether to include descendant counts
 * @returns Map of tag to count
 */
export function calculateTagCounts(
  files: QuartzPluginData[],
  cumulative: boolean = true
): Map<string, number> {
  const counts = new Map<string, number>()
  
  // First pass: direct counts
  for (const file of files) {
    const tags = getTagsForFile(file)
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  
  if (!cumulative) {
    return counts
  }
  
  // Second pass: accumulate ancestor counts
  const allTags = Array.from(counts.keys())
  
  // Sort by depth (deepest first) to accumulate bottom-up
  const sortedTags = allTags.sort((a, b) => getTagDepth(b) - getTagDepth(a))
  
  for (const tag of sortedTags) {
    const parent = getParentTag(tag)
    if (parent) {
      const tagCount = counts.get(tag) || 0
      const parentCount = counts.get(parent) || 0
      counts.set(parent, parentCount + tagCount)
    }
  }
  
  return counts
}

/**
 * Get all files that match a tag filter.
 * 
 * @param tag - Tag to filter by
 * @param files - Array of all files
 * @param includeDescendants - Whether to include files with descendant tags
 * @returns Filtered array of files
 */
export function getFilesWithTag(
  tag: string,
  files: QuartzPluginData[],
  includeDescendants: boolean = false
): QuartzPluginData[] {
  return files.filter(file => {
    const fileTags = getTagsForFile(file)
    return matchesTagFilter(fileTags, tag, includeDescendants)
  })
}

/**
 * Extract all unique tags from a collection of files.
 * Includes all ancestor tags in the hierarchy.
 * 
 * @param files - Array of files
 * @returns Array of all unique tags (including ancestors)
 */
export function extractAllTags(files: QuartzPluginData[]): string[] {
  const tagSet = new Set<string>()
  
  for (const file of files) {
    const tags = getTagsForFile(file)
    
    for (const tag of tags) {
      // Add the tag itself
      tagSet.add(tag)
      
      // Add all ancestors
      const ancestors = getAllAncestors(tag)
      for (const ancestor of ancestors) {
        tagSet.add(ancestor)
      }
    }
  }
  
  return Array.from(tagSet).sort()
}
