import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import style from "../styles/listPage.scss"
import { PageList, SortFn } from "../PageList"
import { FullSlug, getAllSegmentPrefixes, resolveRelative, simplifySlug } from "../../util/path"
import { QuartzPluginData } from "../../plugins/vfile"
import { Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { i18n } from "../../i18n"
import { ComponentChildren } from "preact"
import { concatenateResources } from "../../util/resources"

interface TagContentOptions {
  sort?: SortFn
  numPages: number
}

const defaultOptions: TagContentOptions = {
  numPages: 10,
}

/**
 * Get all direct child tags for a given parent tag
 * e.g., for "engineering", returns ["engineering/bio", "engineering/data", ...]
 */
function getChildTags(parentTag: string, allTags: string[]): string[] {
  const prefix = parentTag ? `${parentTag}/` : ""
  const prefixLength = prefix.length

  return allTags
    .filter((tag) => {
      if (parentTag === "" || parentTag === "/") {
        // For root, return top-level tags only (no slashes)
        return !tag.includes("/")
      }
      // Must start with parent prefix and have exactly one more segment
      if (!tag.startsWith(prefix)) return false
      const remainder = tag.slice(prefixLength)
      return !remainder.includes("/")
    })
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Get all posts that have exactly this tag (not children)
 * e.g., for "engineering", returns posts tagged with "engineering" but not "engineering/bio"
 */
function getPostsWithExactTag(tag: string, allFiles: QuartzPluginData[]): QuartzPluginData[] {
  return allFiles.filter((file) => {
    const tags = file.frontmatter?.tags ?? []
    return tags.includes(tag)
  })
}

/**
 * Get all posts that have this tag or any child tag
 */
function getPostsWithTagOrChildren(tag: string, allFiles: QuartzPluginData[]): QuartzPluginData[] {
  return allFiles.filter((file) => {
    const tags = file.frontmatter?.tags ?? []
    return tags.some((t) => t === tag || t.startsWith(`${tag}/`))
  })
}

export default ((opts?: Partial<TagContentOptions>) => {
  const options: TagContentOptions = { ...defaultOptions, ...opts }

  const TagContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, allFiles, cfg } = props
    const slug = fileData.slug

    if (!(slug?.startsWith("tags/") || slug === "tags")) {
      throw new Error(`Component "TagContent" tried to render a non-tag page: ${slug}`)
    }

    // Extract tag from slug and normalize by removing trailing slashes  
    const tag = simplifySlug(slug.slice("tags/".length) as FullSlug).replace(/\/$/, "")
    const allPagesWithTag = (tag: string) =>
      allFiles.filter((file) => {
        const prefixes = (file.frontmatter?.tags ?? []).flatMap(getAllSegmentPrefixes)
        return prefixes.includes(tag)
      })

    const content = (
      (tree as Root).children.length === 0
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = cssClasses.join(" ")

    // Debug: Inject tag value as HTML comment
    const debugComment = `<!-- Debug: tag="${tag}", slug="${slug}", allFiles.length=${allFiles.length} -->`

    if (tag === "/") {
      const tags = [
        ...new Set(
          allFiles.flatMap((data) => data.frontmatter?.tags ?? []).flatMap(getAllSegmentPrefixes),
        ),
      ].sort((a, b) => a.localeCompare(b))
      const tagItemMap: Map<string, QuartzPluginData[]> = new Map()
      for (const tag of tags) {
        tagItemMap.set(tag, allPagesWithTag(tag))
      }
      return (
        <div class="popover-hint">
          <article class={classes}>{content}</article>
          <p>{i18n(cfg.locale).pages.tagContent.totalTags({ count: tags.length })}</p>
          <div>
            {tags.map((tag) => {
              const pages = tagItemMap.get(tag)!
              const listProps = {
                ...props,
                allFiles: pages,
              }

              const contentPage = allFiles.filter((file) => file.slug === `tags/${tag}`).at(0)

              const root = contentPage?.htmlAst
              const content =
                !root || root?.children.length === 0
                  ? contentPage?.description
                  : htmlToJsx(contentPage.filePath!, root)

              const tagListingPage = `/tags/${tag}` as FullSlug
              const href = resolveRelative(fileData.slug!, tagListingPage)

              return (
                <div>
                  <h2>
                    <a class="internal tag-link" href={href}>
                      {tag}
                    </a>
                  </h2>
                  {content && <p>{content}</p>}
                  <div class="page-listing">
                    <p>
                      {i18n(cfg.locale).pages.tagContent.itemsUnderTag({ count: pages.length })}
                      {pages.length > options.numPages && (
                        <>
                          {" "}
                          <span>
                            {i18n(cfg.locale).pages.tagContent.showingFirst({
                              count: options.numPages,
                            })}
                          </span>
                        </>
                      )}
                    </p>
                    <PageList limit={options.numPages} {...listProps} sort={options?.sort} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    } else {
      const pages = allPagesWithTag(tag)
      const listProps = {
        ...props,
        allFiles: pages,
      }

      // Get all existing tags to determine hierarchy
      const allTags = [
        ...new Set(
          allFiles.flatMap((data) => data.frontmatter?.tags ?? []).flatMap(getAllSegmentPrefixes),
        ),
      ]

      const childTags = getChildTags(tag, allTags)
      const hasChildren = childTags.length > 0

      if (hasChildren) {
        // Parent tag: show subtags with their posts, plus direct posts
        const directPosts = getPostsWithExactTag(tag, allFiles)
        const directListProps = {
          ...props,
          allFiles: directPosts,
        }

        // Sort child tags by post count (descending)
        const sortedChildTags = childTags
          .map((childTag) => ({
            tag: childTag,
            count: getPostsWithTagOrChildren(childTag, allFiles).length,
          }))
          .sort((a, b) => b.count - a.count)
          .map((item) => item.tag)

        return (
          <div class="popover-hint">
            <article class={classes}>{content}</article>
            <div class="page-listing">
              {/* Direct Posts Section (shown first) */}
              {directPosts.length > 0 && (
                <>
                  <h2>Posts</h2>
                  <p>
                    {i18n(cfg.locale).pages.tagContent.itemsUnderTag({ count: directPosts.length })}
                  </p>
                  <div>
                    <PageList {...directListProps} sort={options?.sort} />
                  </div>
                </>
              )}

              {/* Subtags Section (shown after direct posts) */}
              {sortedChildTags.length > 0 && (
                <>
                  <h2>Subtags</h2>
                  {sortedChildTags.map((childTag) => {
                    const childPages = getPostsWithTagOrChildren(childTag, allFiles)
                    const childListProps = {
                      ...props,
                      allFiles: childPages,
                    }

                    const childSlug = childTag.split("/").pop() || childTag
                    const tagListingPage = `/tags/${childTag}` as FullSlug
                    const href = resolveRelative(fileData.slug!, tagListingPage)

                    const childContentPage = allFiles.filter((file) => file.slug === `tags/${childTag}`).at(0)
                    const childRoot = childContentPage?.htmlAst
                    const childContent =
                      !childRoot || childRoot?.children.length === 0
                        ? childContentPage?.description
                        : htmlToJsx(childContentPage.filePath!, childRoot)

                    return (
                      <details class="subtag-section">
                        <summary>
                          <a class="internal tag-link" href={href}>
                            {childSlug}
                          </a>
                          {" "}
                          <span class="tag-count">
                            ({i18n(cfg.locale).pages.tagContent.itemsUnderTag({ count: childPages.length })})
                          </span>
                        </summary>
                        <div class="subtag-content">
                          {childContent && <article>{childContent}</article>}
                          <PageList limit={options.numPages} {...childListProps} sort={options?.sort} />
                        </div>
                      </details>
                    )
                  })}
                </>
              )}

              {directPosts.length === 0 && childTags.length === 0 && (
                <p>{i18n(cfg.locale).pages.tagContent.itemsUnderTag({ count: 0 })}</p>
              )}
            </div>
          </div>
        )
      } else {
        // Leaf tag: show all posts with this tag
        return (
          <div class="popover-hint">
            <article class={classes}>{content}</article>
            <div class="page-listing">
              <p>{i18n(cfg.locale).pages.tagContent.itemsUnderTag({ count: pages.length })}</p>
              <div>
                <PageList {...listProps} sort={options?.sort} />
              </div>
            </div>
          </div>
        )
      }
    }
  }

  TagContent.css = concatenateResources(style, PageList.css)
  return TagContent
}) satisfies QuartzComponentConstructor
