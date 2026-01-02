import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/tagExplorer.scss"

// @ts-ignore
import script from "./scripts/TagExplorer.inline"
import { classNames } from "../util/lang"
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

  const TagExplorer: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
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
        <div id={id} class="tag-explorer-content" role="group">
          <OverflowList class="tag-explorer-ul" />
        </div>
        <template id="template-tag-node">
          <li>
            <div class="tag-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="6 9 12 6"
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
