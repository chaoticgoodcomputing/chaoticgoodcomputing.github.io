import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

/**
 * IndexTitle component - displays the site title as an H1 heading.
 * Specifically designed for the homepage/index page.
 */
const IndexTitle: QuartzComponent = ({ cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  return (
    <h1 class={classNames(displayClass, "index-title")}>
      <a href="/">{title}</a>
    </h1>
  )
}

IndexTitle.css = `
.index-title {
  font-size: 2.5rem;
  margin: 0 0 1rem 0;
  font-family: var(--titleFont);
  text-align: center;
}

.index-title a {
  text-decoration: none;
  color: var(--dark);
}
`

export default (() => IndexTitle) satisfies QuartzComponentConstructor
