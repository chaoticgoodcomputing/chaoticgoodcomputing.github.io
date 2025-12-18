export type TagIconMap = Record<string, string>

/**
 * Service for resolving icons for tag paths.
 * Supports exact matches and parent path fallback.
 * 
 * Example:
 *   iconMap = { "engineering": "🔧", "engineering/typescript": "🔷" }
 *   getIcon("engineering/typescript") => "🔷"
 *   getIcon("engineering/python") => "🔧" (falls back to parent)
 *   getIcon("notes") => "📁" (default)
 */
export class TagIconService {
  private iconMap: TagIconMap
  private defaultIcon: string

  constructor(iconMap: TagIconMap = {}, defaultIcon: string = "📁") {
    this.iconMap = iconMap
    this.defaultIcon = defaultIcon
  }

  /**
   * Get icon for a tag path, with fallback to parent paths and default
   */
  getIcon(tagPath: string): string {
    // Exact match first
    if (this.iconMap[tagPath]) {
      return this.iconMap[tagPath]
    }

    // Check parent paths (engineering/typescript -> engineering)
    const segments = tagPath.split("/")
    for (let i = segments.length - 1; i > 0; i--) {
      const parentPath = segments.slice(0, i).join("/")
      if (this.iconMap[parentPath]) {
        return this.iconMap[parentPath]
      }
    }

    return this.defaultIcon
  }
}
