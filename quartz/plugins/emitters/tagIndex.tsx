/**
 * TagIndex Emitter
 * 
 * Processes all tags during the build phase to create a comprehensive tag index
 * with metadata including hierarchy, colors, icons, and post counts.
 * 
 * This runs during the emit phase of Quartz's build pipeline and outputs
 * a JSON file (static/tagIndex.json) that can be loaded by client-side components.
 */

import { QuartzEmitterPlugin } from "../types"
import { FullSlug, joinSegments } from "../../util/path"
import { write } from "./helpers"
import type { TagMetadata } from "../../util/tags"
import {
  tagToSlug,
  getParentTag,
  getAllAncestors,
  getChildTags,
  getAllDescendants,
  getTagDepth,
  getColorForTag,
  getIconForTag,
  extractAllTags,
  getTagsForFile,
} from "../../util/tags"

const DEFAULT_COLOR = "#888888"
const DEFAULT_ICON = null

export const TagIndex: QuartzEmitterPlugin = () => {
  return {
    name: "TagIndex",
    async *emit(ctx, content) {
      const cfg = ctx.cfg.configuration
      const tagConfig = cfg.tags || {}
      const colorConfig = tagConfig.colors || []
      const iconConfig = tagConfig.icons || []
      const defaultColor = tagConfig.defaultColor || DEFAULT_COLOR
      const defaultIcon = tagConfig.defaultIcon !== undefined ? tagConfig.defaultIcon : DEFAULT_ICON

      // Extract all files and their tags
      const allFiles = Array.from(content).map(([_, file]) => file.data)

      // Build complete list of tags (including ancestors)
      const allTags = extractAllTags(allFiles)

      // Calculate direct post counts
      const directCounts = new Map<string, number>()
      for (const file of allFiles) {
        const tags = getTagsForFile(file)
        for (const tag of tags) {
          directCounts.set(tag, (directCounts.get(tag) || 0) + 1)
        }
      }

      // Calculate cumulative counts (including descendants)
      const cumulativeCounts = new Map<string, number>(directCounts)

      // Sort tags by depth (deepest first) to accumulate counts bottom-up
      const sortedTags = [...allTags].sort((a, b) => getTagDepth(b) - getTagDepth(a))

      for (const tag of sortedTags) {
        const parent = getParentTag(tag)
        if (parent) {
          const tagCount = cumulativeCounts.get(tag) || 0
          const parentCount = cumulativeCounts.get(parent) || 0
          cumulativeCounts.set(parent, parentCount + tagCount)
        }
      }

      // Build metadata for each tag
      const tagMetadataMap: { [tag: string]: TagMetadata } = {}

      for (const tag of allTags) {
        const parent = getParentTag(tag)
        const children = getChildTags(tag, allTags)
        const ancestors = getAllAncestors(tag)
        const descendants = getAllDescendants(tag, allTags)
        const depth = getTagDepth(tag)
        const postCount = directCounts.get(tag) || 0
        const totalPostCount = cumulativeCounts.get(tag) || 0

        // Resolve color (tag → ancestors → default)
        const color = getColorForTag(tag, colorConfig, defaultColor)

        // Resolve icon (exact match only)
        const icon = getIconForTag(tag, iconConfig, defaultIcon)

        const metadata: TagMetadata = {
          tag,
          slug: tagToSlug(tag),
          color,
          icon,
          parent,
          children,
          ancestors,
          descendants,
          depth,
          postCount,
          totalPostCount,
        }

        tagMetadataMap[tag] = metadata
      }

      // Build top-level tags list
      const topLevelTags = allTags.filter(tag => getTagDepth(tag) === 0).sort()

      // Extract icon config order for priority-based selection
      const iconConfigOrder = iconConfig.map(config => config.tag)

      // Create tag index
      const tagIndex = {
        tags: tagMetadataMap,
        topLevelTags,
        allTags,
        iconConfigOrder,
      }

      // Write to static/tagIndex.json
      const fp = joinSegments("static", "tagIndex") as FullSlug
      yield write({
        ctx,
        content: JSON.stringify(tagIndex, null, 2),
        slug: fp,
        ext: ".json",
      })
    },
  }
}
