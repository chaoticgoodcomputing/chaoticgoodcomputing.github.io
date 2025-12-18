import { TagTrieNode } from "../../util/tagTrie"
import { FullSlug, resolveRelative } from "../../util/path"
import { ContentDetails } from "../../plugins/emitters/contentIndex"

type MaybeHTMLElement = HTMLElement | undefined

/** Configuration options for tag explorer behavior and display */
interface ParsedOptions {
  folderClickBehavior: "collapse" | "link"
  folderDefaultState: "collapsed" | "open"
  useSavedState: boolean
  tagNodeSort: string
  fileNodeSort: string
  excludeTags: string[]
  showFileCount: boolean
  expandCurrentFileTags: boolean
}

/**
 * Represents the collapsed/expanded state of a tag in the explorer.
 */
type TagState = {
  path: string
  collapsed: boolean
}

/**
 * Represents the current state of the tag explorer.
 */
let currentTagExplorerState: Array<TagState>

/**
 * Load saved tag collapse state from localStorage
 */
function _loadTagState(opts: ParsedOptions): Map<string, boolean> {
  if (!opts.useSavedState) return new Map()
  const storageTree = localStorage.getItem("tagTree")
  if (!storageTree) return new Map()
  const parsed = JSON.parse(storageTree) as TagState[]
  return new Map(parsed.map((entry) => [entry.path, entry.collapsed]))
}

/**
 * Save current tag collapse state to localStorage
 */
function _saveTagState() {
  const stringified = JSON.stringify(currentTagExplorerState)
  localStorage.setItem("tagTree", stringified)
}

/**
 * Load saved scroll position from sessionStorage
 */
function _loadScrollPosition(): number | null {
  const scrollTop = sessionStorage.getItem("tagExplorerScrollTop")
  return scrollTop ? parseInt(scrollTop) : null
}

/**
 * Save scroll position to sessionStorage
 */
function _saveScrollPosition(ul: Element) {
  sessionStorage.setItem("tagExplorerScrollTop", ul.scrollTop.toString())
}

/**
 * Update the collapsed state of a tag in the current state array
 */
function _updateTagState(tagPath: string, isCollapsed: boolean) {
  const existingState = currentTagExplorerState.find((item) => item.path === tagPath)
  if (existingState) {
    existingState.collapsed = isCollapsed
  } else {
    currentTagExplorerState.push({ path: tagPath, collapsed: isCollapsed })
  }
}

/**
 * Create comparator function for sorting tag nodes
 */
function _createTagNodeSortFn(strategy: string) {
  return (a: TagTrieNode, b: TagTrieNode) => {
    switch (strategy) {
      case "count-desc":
        return b.totalFileCount - a.totalFileCount
      case "count-asc":
        return a.totalFileCount - b.totalFileCount
      case "alphabetical":
        return a.tagSegment.localeCompare(b.tagSegment, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      case "alphabetical-reverse":
        return b.tagSegment.localeCompare(a.tagSegment, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      default:
        return 0
    }
  }
}

/**
 * Create comparator function for sorting file nodes
 */
function _createFileNodeSortFn(strategy: string) {
  return (a: ContentDetails, b: ContentDetails) => {
    switch (strategy) {
      case "date-desc":
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      case "date-asc":
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      case "alphabetical":
        return a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      case "alphabetical-reverse":
        return b.title.localeCompare(a.title, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      default:
        return 0
    }
  }
}

/**
 * Check if a tag node has the given file in any descendant
 */
function _hasFileInDescendants(node: TagTrieNode, slug: FullSlug): boolean {
  if (node.files.some((file) => file.slug === slug)) return true
  return node.children.some((child) => _hasFileInDescendants(child, slug))
}

/**
 * Determine if a tag should be expanded based on state and options
 */
function _shouldExpandTag(
  tagPath: string,
  node: TagTrieNode,
  currentSlug: FullSlug,
  opts: ParsedOptions,
): boolean {
  const savedState = currentTagExplorerState.find((item) => item.path === tagPath)
  const isCollapsed = savedState?.collapsed ?? opts.folderDefaultState === "collapsed"

  if (!isCollapsed) return true

  if (opts.expandCurrentFileTags) {
    const currentFileInTag = node.files.some((file) => file.slug === currentSlug)
    const childHasCurrentFile = _hasFileInDescendants(node, currentSlug)
    return currentFileInTag || childHasCurrentFile
  }

  return false
}

/**
 * Create a file node list item from a ContentDetails object
 */
function _createFileNode(currentSlug: FullSlug, file: ContentDetails): HTMLLIElement {
  const template = document.getElementById("template-file-node") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const a = li.querySelector("a") as HTMLAnchorElement

  a.href = resolveRelative(currentSlug, file.slug)
  a.dataset.for = file.slug
  a.textContent = file.title

  if (currentSlug === file.slug) a.classList.add("active")

  return li
}

/**
 * Build tag title as a clickable link
 */
function _buildTagAsLink(
  container: HTMLElement,
  currentSlug: FullSlug,
  node: TagTrieNode,
  opts: ParsedOptions,
) {
  const button = container.querySelector(".tag-button") as HTMLElement
  const a = document.createElement("a")

  a.href = resolveRelative(currentSlug, `tags/${node.fullTagPath}` as FullSlug)
  a.dataset.for = node.fullTagPath
  a.className = "tag-link"

  const titleSpan = document.createElement("span")
  titleSpan.className = "tag-title"
  titleSpan.textContent = `#${node.tagSegment}`
  a.appendChild(titleSpan)

  if (opts.showFileCount) {
    const countSpan = document.createElement("span")
    countSpan.className = "tag-count"
    countSpan.textContent = ` (${node.totalFileCount})`
    a.appendChild(countSpan)
  }

  button.replaceWith(a)
}

/**
 * Build tag title as a collapsible button
 */
function _buildTagAsButton(container: HTMLElement, node: TagTrieNode, opts: ParsedOptions) {
  const titleSpan = container.querySelector(".tag-title") as HTMLElement
  titleSpan.textContent = `#${node.tagSegment}`

  if (opts.showFileCount) {
    const countSpan = container.querySelector(".tag-count") as HTMLElement
    countSpan.textContent = ` (${node.totalFileCount})`
  } else {
    const countSpan = container.querySelector(".tag-count") as HTMLElement
    countSpan.remove()
  }
}

/**
 * Append child tag nodes and file nodes to a parent list
 */
function _appendChildNodes(
  ul: HTMLUListElement,
  currentSlug: FullSlug,
  node: TagTrieNode,
  opts: ParsedOptions,
) {
  for (const child of node.children) {
    const childNode = _createTagNode(currentSlug, child, opts)
    ul.appendChild(childNode)
  }

  for (const file of node.files) {
    const fileNode = _createFileNode(currentSlug, file)
    ul.appendChild(fileNode)
  }
}

/**
 * Create a tag node list item from a TagTrieNode
 */
function _createTagNode(
  currentSlug: FullSlug,
  node: TagTrieNode,
  opts: ParsedOptions,
): HTMLLIElement {
  const template = document.getElementById("template-tag-node") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const tagContainer = li.querySelector(".tag-container") as HTMLElement
  const titleContainer = tagContainer.querySelector("div") as HTMLElement
  const tagOuter = li.querySelector(".tag-outer") as HTMLElement
  const ul = tagOuter.querySelector("ul") as HTMLUListElement

  tagContainer.dataset.tagpath = node.fullTagPath

  if (opts.folderClickBehavior === "link") {
    _buildTagAsLink(titleContainer, currentSlug, node, opts)
  } else {
    _buildTagAsButton(titleContainer, node, opts)
  }

  if (_shouldExpandTag(node.fullTagPath, node, currentSlug, opts)) {
    tagOuter.classList.add("open")
  }

  _appendChildNodes(ul, currentSlug, node, opts)

  return li
}

/**
 * Restore scroll position, falling back to scrolling to active element
 */
function _restoreScrollPosition(ul: Element) {
  const scrollTop = _loadScrollPosition()
  if (scrollTop !== null) {
    ul.scrollTop = scrollTop
  } else {
    const activeElement = ul.querySelector(".active")
    activeElement?.scrollIntoView({ behavior: "smooth" })
  }
}

/**
 * Find the tag container element from a click target
 */
function _findTagContainer(target: HTMLElement): MaybeHTMLElement {
  const isSvg = target.nodeName === "svg"
  return (isSvg ? target.parentElement : target.parentElement?.parentElement) as MaybeHTMLElement
}

/**
 * Toggle the explorer panel open/closed
 */
function _toggleExplorer(this: HTMLElement) {
  const explorer = this.closest(".tag-explorer") as HTMLElement
  if (!explorer) return

  const collapsed = explorer.classList.toggle("collapsed")
  explorer.setAttribute("aria-expanded", collapsed ? "false" : "true")

  if (collapsed) {
    document.documentElement.classList.remove("mobile-no-scroll")
  } else {
    document.documentElement.classList.add("mobile-no-scroll")
  }
}

/**
 * Toggle a tag folder open/closed
 */
function _toggleTag(evt: MouseEvent) {
  evt.stopPropagation()
  const target = evt.target as MaybeHTMLElement
  if (!target) return

  const tagContainer = _findTagContainer(target)
  if (!tagContainer) return

  const childTagContainer = tagContainer.nextElementSibling as MaybeHTMLElement
  if (!childTagContainer) return

  const isOpen = childTagContainer.classList.toggle("open")
  const tagPath = tagContainer.dataset.tagpath as string

  _updateTagState(tagPath, !isOpen)
  _saveTagState()
}

/**
 * Attach all event listeners to an explorer element
 */
function _attachEventListeners(explorer: HTMLElement, opts: ParsedOptions) {
  const toggleButtons = explorer.getElementsByClassName(
    "tag-explorer-toggle",
  ) as HTMLCollectionOf<HTMLElement>
  for (const button of toggleButtons) {
    button.addEventListener("click", _toggleExplorer)
    window.addCleanup(() => button.removeEventListener("click", _toggleExplorer))
  }

  if (opts.folderClickBehavior === "collapse") {
    const tagButtons = explorer.getElementsByClassName("tag-button") as HTMLCollectionOf<
      HTMLElement
    >
    for (const button of tagButtons) {
      button.addEventListener("click", _toggleTag)
      window.addCleanup(() => button.removeEventListener("click", _toggleTag))
    }
  }

  const foldIcons = explorer.getElementsByClassName("tag-fold-icon") as HTMLCollectionOf<
    HTMLElement
  >
  for (const icon of foldIcons) {
    icon.addEventListener("click", _toggleTag)
    window.addCleanup(() => icon.removeEventListener("click", _toggleTag))
  }
}

/**
 * Parse configuration options from explorer dataset attributes
 */
function _parseExplorerOptions(explorer: HTMLElement): ParsedOptions {
  return {
    ...JSON.parse(explorer.dataset.opts || "{}"),
    folderClickBehavior: (explorer.dataset.behavior || "collapse") as "collapse" | "link",
    folderDefaultState: (explorer.dataset.collapsed || "collapsed") as "collapsed" | "open",
    useSavedState: explorer.dataset.savestate === "true",
  }
}

/**
 * Build tag trie from entries and apply sorting to tags and files
 */
function _buildAndSortTagTrie(
  entries: [FullSlug, ContentDetails][],
  opts: ParsedOptions,
): TagTrieNode {
  const tagTrie = TagTrieNode.fromTaggedEntries(entries, opts.excludeTags)
  tagTrie.sort(_createTagNodeSortFn(opts.tagNodeSort))
  tagTrie.map((node) => node.files.sort(_createFileNodeSortFn(opts.fileNodeSort)))
  return tagTrie
}

/**
 * Initialize the tag state array from saved state and tag trie
 */
function _initializeTagState(tagTrie: TagTrieNode, opts: ParsedOptions) {
  const oldState = _loadTagState(opts)
  const tagPaths = tagTrie.getTagPaths()

  currentTagExplorerState = tagPaths.map((path) => ({
    path,
    collapsed: oldState.get(path) ?? opts.folderDefaultState === "collapsed",
  }))
}

/**
 * Render the tag tree into the explorer list
 */
function _renderTagTree(
  ul: Element,
  currentSlug: FullSlug,
  tagTrie: TagTrieNode,
  opts: ParsedOptions,
) {
  const fragment = document.createDocumentFragment()
  for (const child of tagTrie.children) {
    const node = _createTagNode(currentSlug, child, opts)
    fragment.appendChild(node)
  }
  ul.insertBefore(fragment, ul.firstChild)
}

/**
 * Collapse mobile explorer panel if visible
 */
function _collapseMobileExplorer() {
  for (const explorer of document.getElementsByClassName("tag-explorer")) {
    const mobileExplorer = explorer.querySelector(".mobile-tag-explorer")
    if (!mobileExplorer?.checkVisibility()) continue

    explorer.classList.add("collapsed")
    explorer.setAttribute("aria-expanded", "false")
    document.documentElement.classList.remove("mobile-no-scroll")
    mobileExplorer.classList.remove("hide-until-loaded")
  }
}

/**
 * Handle edge case where desktop explorer stays open on resize to mobile
 */
function _handleDesktopToMobileResize() {
  const explorer = document.querySelector(".tag-explorer")
  if (explorer && !explorer.classList.contains("collapsed")) {
    document.documentElement.classList.add("mobile-no-scroll")
  }
}

// =============
// MARK: MAIN
// =============

/**
 * Initialize all tag explorer instances on the page
 * @param currentSlug - The slug of the currently displayed page
 */
async function setupTagExplorer(currentSlug: FullSlug) {
  const allExplorers = document.querySelectorAll("div.tag-explorer") as NodeListOf<HTMLElement>

  for (const explorer of allExplorers) {
    const opts = _parseExplorerOptions(explorer)
    const data = await fetchData
    const entries = [...Object.entries(data)] as [FullSlug, ContentDetails][]

    const tagTrie = _buildAndSortTagTrie(entries, opts)
    _initializeTagState(tagTrie, opts)

    const explorerUl = explorer.querySelector(".tag-explorer-ul")
    if (!explorerUl) continue

    _renderTagTree(explorerUl, currentSlug, tagTrie, opts)
    _restoreScrollPosition(explorerUl)
    _attachEventListeners(explorer, opts)
  }
}

document.addEventListener("prenav", async () => {
  const explorer = document.querySelector(".tag-explorer-ul")
  if (explorer) _saveScrollPosition(explorer)
})

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  await setupTagExplorer(e.detail.url)
  _collapseMobileExplorer()
})

window.addEventListener("resize", _handleDesktopToMobileResize)
