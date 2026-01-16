import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

/**
 * NotFoundTitle component - displays "404: Page Not Found" as an H1 heading.
 * Specifically designed for the 404 error page.
 */
const NotFoundTitle: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <h1 class={classNames(displayClass, "not-found-title")}>
      <a href="/">404: Page Not Found</a>
    </h1>
  )
}

NotFoundTitle.css = `
.not-found-title {
  font-size: 2.5rem;
  margin: 0 0 1rem 0;
  font-family: var(--titleFont);
  text-align: center;
}

.not-found-title a {
  text-decoration: none;
  color: var(--dark);
}
`

export default (() => NotFoundTitle) satisfies QuartzComponentConstructor
