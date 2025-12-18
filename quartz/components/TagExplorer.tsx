import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/tagExplorer.scss"

// @ts-ignore
import script from "./scripts/tag-explorer.inline"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import OverflowListFactory from "./OverflowList"
import { concatenateResources } from "../util/resources"

export type TagNodeSortStrategy =
  | "alphabetical"
  | "alphabetical-reverse"
  | "count-desc"
  | "count-asc"

export type FileNodeSortStrategy =
  | "alphabetical"
  | "alphabetical-reverse"
  | "date-desc"
  | "date-asc"

export interface Options {
  title?: string
  folderDefaultState: "collapsed" | "open"
  folderClickBehavior: "collapse" | "link"
  useSavedState: boolean

  // Sorting
  tagNodeSort: TagNodeSortStrategy
  fileNodeSort: FileNodeSortStrategy

  // Filtering
  excludeTags: string[]

  // Display
  showFileCount: boolean
  expandCurrentFileTags: boolean
}

const defaultOptions: Options = {
  folderDefaultState: "collapsed",
  folderClickBehavior: "link",
  useSavedState: true,
  tagNodeSort: "count-desc",
  fileNodeSort: "date-desc",
  excludeTags: [],
  showFileCount: true,
  expandCurrentFileTags: true,
}

export type TagState = {
  path: string
  collapsed: boolean
}

let numTagExplorers = 0
export default ((userOpts?: Partial<Options>) => {
  const opts: Options = { ...defaultOptions, ...userOpts }
  const { OverflowList, overflowListAfterDOMLoaded } = OverflowListFactory()

  const TagExplorer: QuartzComponent = ({ cfg, displayClass }: QuartzComponentProps) => {
    const id = `tag-explorer-${numTagExplorers++}`

    return (
      <div
        class={classNames(displayClass, "tag-explorer")}
        data-behavior={opts.folderClickBehavior}
        data-collapsed={opts.folderDefaultState}
        data-savestate={opts.useSavedState}
        data-opts={JSON.stringify({
          tagNodeSort: opts.tagNodeSort,
          fileNodeSort: opts.fileNodeSort,
          excludeTags: opts.excludeTags,
          showFileCount: opts.showFileCount,
          expandCurrentFileTags: opts.expandCurrentFileTags,
        })}
      >
        <button
          type="button"
          class="tag-explorer-toggle mobile-tag-explorer hide-until-loaded"
          data-mobile={true}
          aria-controls={id}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-menu"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          class="title-button tag-explorer-toggle desktop-tag-explorer"
          data-mobile={false}
          aria-expanded={true}
        >
          <h2>{opts.title ?? i18n(cfg.locale).components.explorer.title}</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="5 8 14 8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div id={id} class="tag-explorer-content" aria-expanded={false} role="group">
          <OverflowList class="tag-explorer-ul" />
        </div>
        <template id="template-tag-node">
          <li>
            <div class="tag-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="5 8 14 8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="tag-fold-icon"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <div>
                <button class="tag-button">
                  <span class="tag-title"></span>
                  <span class="tag-count"></span>
                </button>
              </div>
            </div>
            <div class="tag-outer">
              <ul class="content"></ul>
            </div>
          </li>
        </template>
        <template id="template-file-node">
          <li>
            <a href="#" class="file-link">
              <span class="file-title"></span>
            </a>
          </li>
        </template>
      </div>
    )
  }

  TagExplorer.css = style
  TagExplorer.afterDOMLoaded = concatenateResources(script, overflowListAfterDOMLoaded)
  return TagExplorer
}) satisfies QuartzComponentConstructor
