import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { byDateAndAlphabetical, SortFn } from "./PageList"

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
          return tags.includes(currentTag)
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
                <ul class="tags">
                  {tags.map((tag) => (
                    <li>
                      <a
                        class="internal tag-link"
                        href={resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)}
                      >
                        {tag}
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

  return PostListing
}) satisfies QuartzComponentConstructor<PostListingOptions>
