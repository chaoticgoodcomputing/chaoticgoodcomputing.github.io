import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import style from "../styles/listPage.scss"
import { Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { ComponentChildren } from "preact"

/**
 * TagContent component - renders the article content for tag pages.
 * Post listings are now handled by the PostListing component in layout files.
 */
export default (() => {
  const TagContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData } = props
    const slug = fileData.slug

    if (!(slug?.startsWith("tags/") || slug === "tags")) {
      throw new Error(`Component "TagContent" tried to render a non-tag page: ${slug}`)
    }

    const content = (
      (tree as Root).children.length === 0
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren
    
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = cssClasses.join(" ")

    return (
      <div class="popover-hint">
        <article class={classes}>{content}</article>
      </div>
    )
  }

  TagContent.css = style
  return TagContent
}) satisfies QuartzComponentConstructor
