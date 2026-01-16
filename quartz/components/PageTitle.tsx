import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const authorName = cfg?.structuredData?.author?.name

  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a href="/">
        <img src="/static/icon.png" class="page-title-icon" alt="" />
        <div class="page-title-text">
          <span class="page-title-name">{title}</span>
          {authorName && <span class="page-title-author">by {authorName}</span>}
        </div>
      </a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  font-size: 1.75rem;
  margin: 0;
  font-family: var(--titleFont);
}

.page-title a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: inherit;
}

.page-title-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  object-fit: cover;
}

.page-title-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title-name {
  font-size: 1.75rem;
  line-height: 1.2;
}

.page-title-author {
  font-size: 0.875rem;
  opacity: 0.7;
  font-weight: normal;
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
