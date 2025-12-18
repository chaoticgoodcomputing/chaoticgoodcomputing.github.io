import { TagTrieNode } from "../../util/tagTrie"
import { FullSlug, resolveRelative } from "../../util/path"
import { ContentDetails } from "../../plugins/emitters/contentIndex"

type MaybeHTMLElement = HTMLElement | undefined

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

type TagState = {
  path: string
  collapsed: boolean
}

let currentTagExplorerState: Array<TagState>

function toggleTagExplorer(this: HTMLElement) {
  const nearestExplorer = this.closest(".tag-explorer") as HTMLElement
  if (!nearestExplorer) return
  const explorerCollapsed = nearestExplorer.classList.toggle("collapsed")
  nearestExplorer.setAttribute(
    "aria-expanded",
    nearestExplorer.getAttribute("aria-expanded") === "true" ? "false" : "true",
  )

  if (!explorerCollapsed) {
    // Stop <html> from being scrollable when mobile explorer is open
    document.documentElement.classList.add("mobile-no-scroll")
  } else {
    document.documentElement.classList.remove("mobile-no-scroll")
  }
}

function toggleTag(evt: MouseEvent) {
  evt.stopPropagation()
  const target = evt.target as MaybeHTMLElement
  if (!target) return

  // Check if target was svg icon or button
  const isSvg = target.nodeName === "svg"

  // corresponding <ul> element relative to clicked button/tag
  const tagContainer = (
    isSvg
      ? // svg -> div.tag-container
        target.parentElement
      : // button.tag-button -> div -> div.tag-container
        target.parentElement?.parentElement
  ) as MaybeHTMLElement
  if (!tagContainer) return
  const childTagContainer = tagContainer.nextElementSibling as MaybeHTMLElement
  if (!childTagContainer) return

  childTagContainer.classList.toggle("open")

  // Collapse tag container
  const isCollapsed = !childTagContainer.classList.contains("open")
  setTagState(childTagContainer, isCollapsed)

  const currentTagState = currentTagExplorerState.find(
    (item) => item.path === tagContainer.dataset.tagpath,
  )
  if (currentTagState) {
    currentTagState.collapsed = isCollapsed
  } else {
    currentTagExplorerState.push({
      path: tagContainer.dataset.tagpath as string,
      collapsed: isCollapsed,
    })
  }

  const stringifiedTagTree = JSON.stringify(currentTagExplorerState)
  localStorage.setItem("tagTree", stringifiedTagTree)
}

function createFileNode(currentSlug: FullSlug, file: ContentDetails): HTMLLIElement {
  const template = document.getElementById("template-file-node") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const a = li.querySelector("a") as HTMLAnchorElement
  a.href = resolveRelative(currentSlug, file.slug)
  a.dataset.for = file.slug
  a.textContent = file.title

  if (currentSlug === file.slug) {
    a.classList.add("active")
  }

  return li
}

function createTagNode(
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

  const tagPath = node.fullTagPath
  tagContainer.dataset.tagpath = tagPath

  if (opts.folderClickBehavior === "link") {
    // Replace button with link for link behavior
    const button = titleContainer.querySelector(".tag-button") as HTMLElement
    const a = document.createElement("a")
    a.href = resolveRelative(currentSlug, `tags/${tagPath}` as FullSlug)
    a.dataset.for = tagPath
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
  } else {
    const titleSpan = titleContainer.querySelector(".tag-title") as HTMLElement
    titleSpan.textContent = `#${node.tagSegment}`

    if (opts.showFileCount) {
      const countSpan = titleContainer.querySelector(".tag-count") as HTMLElement
      countSpan.textContent = ` (${node.totalFileCount})`
    } else {
      const countSpan = titleContainer.querySelector(".tag-count") as HTMLElement
      countSpan.remove()
    }
  }

  // Check if this tag should be expanded
  const isCollapsed =
    currentTagExplorerState.find((item) => item.path === tagPath)?.collapsed ??
    opts.folderDefaultState === "collapsed"

  // Check if current file is within this tag (for auto-expansion)
  const currentFileInTag = node.files.some((file) => file.slug === currentSlug)
  const childHasCurrentFile = hasFileInDescendants(node, currentSlug)

  if (!isCollapsed || (opts.expandCurrentFileTags && (currentFileInTag || childHasCurrentFile))) {
    tagOuter.classList.add("open")
  }

  // Render children: tags first (sorted), then files (sorted)
  for (const child of node.children) {
    const childNode = createTagNode(currentSlug, child, opts)
    ul.appendChild(childNode)
  }

  for (const file of node.files) {
    const fileNode = createFileNode(currentSlug, file)
    ul.appendChild(fileNode)
  }

  return li
}

function hasFileInDescendants(node: TagTrieNode, slug: FullSlug): boolean {
  if (node.files.some((file) => file.slug === slug)) {
    return true
  }
  return node.children.some((child) => hasFileInDescendants(child, slug))
}

function createTagNodeSortFn(strategy: string) {
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

function createFileNodeSortFn(strategy: string) {
  return (a: ContentDetails, b: ContentDetails) => {
    switch (strategy) {
      case "date-desc":
        const bDate = b.date ? b.date.getTime() : 0
        const aDate = a.date ? a.date.getTime() : 0
        return bDate - aDate
      case "date-asc":
        const aDate2 = a.date ? a.date.getTime() : 0
        const bDate2 = b.date ? b.date.getTime() : 0
        return aDate2 - bDate2
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

async function setupTagExplorer(currentSlug: FullSlug) {
  const allExplorers = document.querySelectorAll("div.tag-explorer") as NodeListOf<HTMLElement>

  for (const explorer of allExplorers) {
    const opts: ParsedOptions = {
      ...JSON.parse(explorer.dataset.opts || "{}"),
      folderClickBehavior: (explorer.dataset.behavior || "collapse") as "collapse" | "link",
      folderDefaultState: (explorer.dataset.collapsed || "collapsed") as "collapsed" | "open",
      useSavedState: explorer.dataset.savestate === "true",
    }

    // Get tag state from local storage
    const storageTree = localStorage.getItem("tagTree")
    const serializedExplorerState = storageTree && opts.useSavedState ? JSON.parse(storageTree) : []
    const oldIndex = new Map<string, boolean>(
      serializedExplorerState.map((entry: TagState) => [entry.path, entry.collapsed]),
    )

    const data = await fetchData
    const entries = [...Object.entries(data)] as [FullSlug, ContentDetails][]

    // Build tag trie with filtering applied at construction
    const tagTrie = TagTrieNode.fromTaggedEntries(entries, opts.excludeTags)

    // Apply sorting to tags
    tagTrie.sort(createTagNodeSortFn(opts.tagNodeSort))

    // Apply sorting to files within each tag
    tagTrie.map((node) => {
      node.files.sort(createFileNodeSortFn(opts.fileNodeSort))
    })

    // Get tag paths for state management
    const tagPaths = tagTrie.getTagPaths()
    currentTagExplorerState = tagPaths.map((path) => {
      const previousState = oldIndex.get(path)
      return {
        path,
        collapsed:
          previousState === undefined ? opts.folderDefaultState === "collapsed" : previousState,
      }
    })

    const explorerUl = explorer.querySelector(".tag-explorer-ul")
    if (!explorerUl) continue

    // Create and insert new content
    const fragment = document.createDocumentFragment()
    for (const child of tagTrie.children) {
      const node = createTagNode(currentSlug, child, opts)
      fragment.appendChild(node)
    }
    explorerUl.insertBefore(fragment, explorerUl.firstChild)

    // Restore explorer scrollTop position if it exists
    const scrollTop = sessionStorage.getItem("tagExplorerScrollTop")
    if (scrollTop) {
      explorerUl.scrollTop = parseInt(scrollTop)
    } else {
      // Try to scroll to the active element if it exists
      const activeElement = explorerUl.querySelector(".active")
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth" })
      }
    }

    // Set up event handlers
    const explorerButtons = explorer.getElementsByClassName(
      "tag-explorer-toggle",
    ) as HTMLCollectionOf<HTMLElement>
    for (const button of explorerButtons) {
      button.addEventListener("click", toggleTagExplorer)
      window.addCleanup(() => button.removeEventListener("click", toggleTagExplorer))
    }

    // Set up tag click handlers
    if (opts.folderClickBehavior === "collapse") {
      const tagButtons = explorer.getElementsByClassName(
        "tag-button",
      ) as HTMLCollectionOf<HTMLElement>
      for (const button of tagButtons) {
        button.addEventListener("click", toggleTag)
        window.addCleanup(() => button.removeEventListener("click", toggleTag))
      }
    }

    const tagFoldIcons = explorer.getElementsByClassName(
      "tag-fold-icon",
    ) as HTMLCollectionOf<HTMLElement>
    for (const icon of tagFoldIcons) {
      icon.addEventListener("click", toggleTag)
      window.addCleanup(() => icon.removeEventListener("click", toggleTag))
    }
  }
}

document.addEventListener("prenav", async () => {
  // Save explorer scrollTop position
  const explorer = document.querySelector(".tag-explorer-ul")
  if (!explorer) return
  sessionStorage.setItem("tagExplorerScrollTop", explorer.scrollTop.toString())
})

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const currentSlug = e.detail.url
  await setupTagExplorer(currentSlug)

  // If mobile hamburger is visible, collapse by default
  for (const explorer of document.getElementsByClassName("tag-explorer")) {
    const mobileExplorer = explorer.querySelector(".mobile-tag-explorer")
    if (!mobileExplorer) return

    if (mobileExplorer.checkVisibility()) {
      explorer.classList.add("collapsed")
      explorer.setAttribute("aria-expanded", "false")

      // Allow <html> to be scrollable when mobile explorer is collapsed
      document.documentElement.classList.remove("mobile-no-scroll")
    }

    mobileExplorer.classList.remove("hide-until-loaded")
  }
})

window.addEventListener("resize", function () {
  // Desktop explorer opens by default, and it stays open when the window is resized
  // to mobile screen size. Applies `no-scroll` to <html> in this edge case.
  const explorer = document.querySelector(".tag-explorer")
  if (explorer && !explorer.classList.contains("collapsed")) {
    document.documentElement.classList.add("mobile-no-scroll")
    return
  }
})

function setTagState(tagElement: HTMLElement, collapsed: boolean) {
  return collapsed ? tagElement.classList.remove("open") : tagElement.classList.add("open")
}
