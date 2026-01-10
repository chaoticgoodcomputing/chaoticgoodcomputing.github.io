import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { byDateAndAlphabetical, SortFn } from "./PageList"
import { matchesTagFilter } from "../util/tags"

// @ts-ignore
import script from "./scripts/PostListing.inline"

export interface PostListingOptions {
  /**
   * Maximum number of posts to display. If undefined, shows all posts.
   */
  limit?: number

  /**
   * Number of posts to show before collapsing the rest into a details element.
   * If undefined, all posts are shown without collapsing.
   */
  collapsedItemCount?: number

  /**
   * Sorting function for posts. Defaults to byDateAndAlphabetical.
   */
  sort?: SortFn

  /**
   * Tags to exclude from the listing. Posts with any of these tags will be filtered out.
   * Default: ["private"]
   */
  excludeTags?: string[]

  /**
   * If true, filters posts to only those that have the current page's tag.
   * Only works on tag pages (pages with slug starting with "tags/").
   * Default: false
   */
  filterToCurrentTag?: boolean

  /**
   * If true, includes posts with subtags when filtering to current tag.
   * For example, on the "engineering" tag page, posts tagged with
   * "engineering/languages/typescript" or "engineering/ai" will also be shown.
   * Only applies when filterToCurrentTag is true.
   * Default: false
   */
  includeSubtags?: boolean

  /**
   * Filter function to determine which pages to include.
   * Takes precedence over excludeTags and filterToCurrentTag if specified.
   */
  filter?: (file: QuartzPluginData) => boolean

  /**
   * Whether to show a "No posts found" message when the list is empty.
   * Default: true
   */
  showEmptyMessage?: boolean

  /**
   * Custom empty message to display when no posts are found.
   */
  emptyMessage?: string

  /**
   * Whether to show tags on each post.
   * Default: true
   */
  showTags?: boolean

  /**
   * Whether to show dates on each post.
   * Default: true
   */
  showDates?: boolean

  /**
   * Whether to show post counts in tag badges.
   * Default: false
   */
  showTagCounts?: boolean
}

const defaultOptions: PostListingOptions = {
  excludeTags: ["private"],
  showEmptyMessage: true,
  emptyMessage: "No posts found.",
  showTags: true,
  showDates: true,
}

export default ((userOpts?: Partial<PostListingOptions>) => {
  const opts: PostListingOptions = { ...defaultOptions, ...userOpts }

  const PostListing: QuartzComponent = ({
    cfg,
    fileData,
    allFiles,
  }: QuartzComponentProps) => {
    const sorter = opts.sort ?? byDateAndAlphabetical(cfg)

    // Apply filtering
    let filteredFiles = allFiles

    if (opts.filter) {
      // Use custom filter if provided
      filteredFiles = filteredFiles.filter(opts.filter)
    } else {
      // Apply filterToCurrentTag if on a tag page
      if (opts.filterToCurrentTag && fileData.slug?.startsWith("tags/")) {
        // Extract tag from slug: "tags/horticulture/index" -> "horticulture"
        const currentTag = fileData.slug
          .replace(/^tags\//, "")
          .replace(/\/index$/, "")
          .replace(/\/$/, "")
        filteredFiles = filteredFiles.filter((file) => {
          const tags = file.frontmatter?.tags ?? []
          return matchesTagFilter(tags, currentTag, opts.includeSubtags ?? false)
        })
      }

      // Apply excludeTags filter
      if (opts.excludeTags && opts.excludeTags.length > 0) {
        filteredFiles = filteredFiles.filter((file) => {
          const tags = file.frontmatter?.tags ?? []
          return !tags.some((tag) => opts.excludeTags!.includes(tag))
        })
      }
    }

    // Apply sorting
    let list = filteredFiles.sort(sorter)

    // Apply limit
    if (opts.limit) {
      list = list.slice(0, opts.limit)
    }

    // Show empty message if no posts
    if (list.length === 0 && opts.showEmptyMessage) {
      return <p class="post-listing-empty">{opts.emptyMessage}</p>
    }

    // Render list items
    const renderListItems = (items: QuartzPluginData[]) =>
      items.map((page) => {
        const title = page.frontmatter?.title
        const tags = page.frontmatter?.tags ?? []

        return (
          <li class="section-li">
            <div class="section">
              {opts.showDates && page.dates && (
                <p class="meta">
                  <Date date={getDate(cfg, page)!} locale={cfg.locale} />
                </p>
              )}
              <div class="desc">
                <h3>
                  <a href={resolveRelative(fileData.slug!, page.slug!)} class="internal">
                    {title}
                  </a>
                </h3>
              </div>
              {opts.showTags && tags.length > 0 && (
                <ul
                  class="tags"
                  data-component="post-listing"
                  data-showcount={opts.showTagCounts}
                >
                  {tags.map((tag) => (
                    <li class="tag-item" data-tag={tag}>
                      <a href="#" class="internal tag-link">
                        <span class="tag-icon-badge"></span>
                        <span class="tag-name"></span>
                        <span class="tag-count"></span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })

    // Handle collapsible list if collapsedItemCount is set
    if (opts.collapsedItemCount && list.length > opts.collapsedItemCount) {
      const visibleItems = list.slice(0, opts.collapsedItemCount)
      const collapsedItems = list.slice(opts.collapsedItemCount)

      return (
        <div>
          <ul class="section-ul">{renderListItems(visibleItems)}</ul>
          <details class="post-listing-collapse">
            <summary>
              Show {collapsedItems.length} more {collapsedItems.length === 1 ? "post" : "posts"}
            </summary>
            <ul class="section-ul">{renderListItems(collapsedItems)}</ul>
          </details>
        </div>
      )
    }

    return <ul class="section-ul">{renderListItems(list)}</ul>
  }

  PostListing.css = `
.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
  list-style: none;
  display: flex;
  padding-left: 0;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.section > .tags > .tag-item {
  display: inline-block;
  white-space: nowrap;
  margin: 0;
  overflow-wrap: normal;
}

.section > .tags a.internal.tag-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 18px 8px 8px 18px;
  background-color: var(--highlight);
  padding: 0.3rem 0.6rem 0.3rem 0.3rem;
  margin: 0;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.2s ease;
}

.section > .tags a.internal.tag-link:hover {
  background-color: var(--gray);
}

.section > .tags .tag-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background-color: transparent;
  border: 2.5px solid var(--tag-color, #888888);
  font-size: 16px;
  line-height: 1;
}

.section > .tags .tag-name {
  font-weight: 500;
  font-size: 0.95em;
  display: flex;
  align-items: center;
}

.section > .tags .tag-name::before {
  content: "#";
  margin-right: 0.2em;
  opacity: 0.7;
}

.section > .tags .tag-count {
  color: var(--gray);
  font-size: 0.85em;
  margin-left: 0.2rem;
}

.post-listing-empty {
  color: var(--gray);
  font-style: italic;
}

.post-listing-collapse {
  margin-top: 1rem;
}

.post-listing-collapse > summary {
  cursor: pointer;
  color: var(--secondary);
  font-weight: 600;
  padding: 0.5rem 0;
}

.post-listing-collapse > summary:hover {
  color: var(--tertiary);
}

.post-listing-collapse > .section-ul {
  margin-top: 1rem;
}
`

  PostListing.afterDOMLoaded = script
  return PostListing
}) satisfies QuartzComponentConstructor<PostListingOptions>
