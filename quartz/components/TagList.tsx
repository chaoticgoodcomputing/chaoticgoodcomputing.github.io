import { FullSlug, resolveRelative, getAllSegmentPrefixes } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

export interface TagListOptions {
  /**
   * When on a tag page, show subtags instead of the current page's tags.
   * Default: false
   */
  showSubtags?: boolean

  /**
   * Show count of posts for each tag (only applies when showSubtags is true).
   * Counts are cumulative - parent tags include all descendant posts.
   * Default: true
   */
  showCount?: boolean
}

const defaultOptions: TagListOptions = {
  showSubtags: false,
  showCount: true,
}

export default ((userOpts?: Partial<TagListOptions>) => {
  const opts: TagListOptions = { ...defaultOptions, ...userOpts }

  const TagList: QuartzComponent = ({ fileData, displayClass, allFiles }: QuartzComponentProps) => {
    const slug = fileData.slug

    // If showSubtags is enabled and we're on a tag page, show subtags
    if (opts.showSubtags && slug?.startsWith("tags/")) {
      // Get current tag from slug (remove "tags/" prefix and "/index" suffix)
      let currentTag = slug === "tags" ? "index" : slug.replace(/^tags\//, "")
      if (currentTag.endsWith("/index")) {
        currentTag = currentTag.slice(0, -6)
      }
      currentTag = currentTag.replace(/\/$/, "")

      // Find all tags in the system with their cumulative counts
      const allTagsInSystem = new Set<string>(
        allFiles
          .flatMap((file) => file.frontmatter?.tags ?? [])
          .flatMap(getAllSegmentPrefixes),
      )

      // Calculate cumulative counts for all tags
      const tagCounts = new Map<string, number>()
      for (const tag of allTagsInSystem) {
        // Count all files that have this tag OR any descendant tag
        const count = allFiles.filter((file) => {
          const fileTags = file.frontmatter?.tags ?? []
          // Check if any file tag starts with this tag (includes exact match and descendants)
          return fileTags.some((fileTag) => {
            return fileTag === tag || fileTag.startsWith(tag + "/")
          })
        }).length
        tagCounts.set(tag, count)
      }

      // Find direct children subtags
      const prefix = currentTag === "index" ? "" : currentTag + "/"
      const subtags: string[] = []

      for (const tag of allTagsInSystem) {
        if (tag === currentTag) continue

        if (tag.startsWith(prefix)) {
          const remainder = tag.slice(prefix.length)
          // Only direct children (no additional slashes)
          if (remainder.length > 0 && !remainder.includes("/")) {
            subtags.push(tag)
          }
        }
      }

      // Sort by count descending, then alphabetically
      subtags.sort((a, b) => {
        const countA = tagCounts.get(a) ?? 0
        const countB = tagCounts.get(b) ?? 0
        if (countB !== countA) return countB - countA
        return a.localeCompare(b)
      })

      if (subtags.length === 0) return null

      return (
        <ul class={classNames(displayClass, "tags")}>
          {subtags.map((tag) => {
            const displayTag = currentTag === "index" ? tag : tag.slice(prefix.length)
            const linkDest = resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)
            const count = tagCounts.get(tag) ?? 0

            return (
              <li>
                <a href={linkDest} class="internal tag-link">
                  {displayTag}
                  {opts.showCount && <span class="tag-count"> ({count})</span>}
                </a>
              </li>
            )
          })}
        </ul>
      )
    }

    // Default behavior: show the current page's tags
    const tags = fileData.frontmatter?.tags
    if (tags && tags.length > 0) {
      return (
        <ul class={classNames(displayClass, "tags")}>
          {tags.map((tag) => {
            const linkDest = resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)
            return (
              <li>
                <a href={linkDest} class="internal tag-link">
                  {tag}
                </a>
              </li>
            )
          })}
        </ul>
      )
    } else {
      return null
    }
  }

  TagList.css = `
.tags {
  list-style: none;
  display: flex;
  padding-left: 0;
  gap: 0.4rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

.section-li > .section > .tags {
  justify-content: flex-end;
}
  
.tags > li {
  display: inline-block;
  white-space: nowrap;
  margin: 0;
  overflow-wrap: normal;
}

a.internal.tag-link {
  border-radius: 8px;
  background-color: var(--highlight);
  padding: 0.2rem 0.4rem;
  margin: 0 0.1rem;
}

.tag-count {
  color: var(--gray);
  font-size: 0.9em;
}
`

  return TagList
}) satisfies QuartzComponentConstructor<TagListOptions>
