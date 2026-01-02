import { registerEscapeHandler } from "../../util"
import { SimpleSlug, getFullSlug, simplifySlug } from "../../../../util/path"
import { addToVisited } from "./visited"
import { renderGraph } from "../ui/legacy"

let localGraphCleanups: (() => void)[] = []
let globalGraphCleanups: (() => void)[] = []

function _cleanupLocalGraphs() {
  for (const cleanup of localGraphCleanups) {
    cleanup()
  }
  localGraphCleanups = []
}

/**
 * Clean up all global graph instances
 */
function _cleanupGlobalGraphs() {
  for (const cleanup of globalGraphCleanups) {
    cleanup()
  }
  globalGraphCleanups = []
}

export async function handleGraphNav(e: CustomEventMap["nav"]) {
  const slug = e.detail.url
  
  // Normalize slug for visited tracking - tag pages need trailing slash
  let normalizedSlug = simplifySlug(slug)
  if (slug.startsWith("tags/") && !normalizedSlug.endsWith("/")) {
    normalizedSlug = (normalizedSlug + "/") as SimpleSlug
  }
  addToVisited(normalizedSlug)

  async function renderLocalGraph() {
    _cleanupLocalGraphs()
    const localGraphContainers = document.getElementsByClassName("graph-container")
    for (const container of localGraphContainers) {
      localGraphCleanups.push(await renderGraph(container as HTMLElement, slug))
    }
  }

  await renderLocalGraph()
  const handleThemeChange = () => {
    void renderLocalGraph()
  }

  document.addEventListener("themechange", handleThemeChange)
  window.addCleanup(() => {
    document.removeEventListener("themechange", handleThemeChange)
  })

  // Render full graph containers (always visible, used on index page)
  async function renderFullGraphs() {
    _cleanupGlobalGraphs()
    const fullGraphContainers = document.getElementsByClassName("full-graph-container")
    for (const container of fullGraphContainers) {
      globalGraphCleanups.push(await renderGraph(container as HTMLElement, slug))
    }
  }

  await renderFullGraphs()
  const handleFullGraphThemeChange = () => {
    void renderFullGraphs()
  }

  document.addEventListener("themechange", handleFullGraphThemeChange)
  window.addCleanup(() => {
    document.removeEventListener("themechange", handleFullGraphThemeChange)
  })

  const containers = [...document.getElementsByClassName("global-graph-outer")] as HTMLElement[]
  async function renderGlobalGraph() {
    const slug = getFullSlug(window)
    for (const container of containers) {
      container.classList.add("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = "1"
      }

      const graphContainer = container.querySelector(".global-graph-container") as HTMLElement
      registerEscapeHandler(container, hideGlobalGraph)
      if (graphContainer) {
        globalGraphCleanups.push(await renderGraph(graphContainer, slug))
      }
    }
  }

  function hideGlobalGraph() {
    _cleanupGlobalGraphs()
    for (const container of containers) {
      container.classList.remove("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = ""
      }
    }
  }

  async function shortcutHandler(e: HTMLElementEventMap["keydown"]) {
    if (e.key === "g" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      const anyGlobalGraphOpen = containers.some((container) =>
        container.classList.contains("active"),
      )
      anyGlobalGraphOpen ? hideGlobalGraph() : renderGlobalGraph()
    }
  }

  const containerIcons = document.getElementsByClassName("global-graph-icon")
  Array.from(containerIcons).forEach((icon) => {
    icon.addEventListener("click", renderGlobalGraph)
    window.addCleanup(() => icon.removeEventListener("click", renderGlobalGraph))
  })

  document.addEventListener("keydown", shortcutHandler)
  window.addCleanup(() => {
    document.removeEventListener("keydown", shortcutHandler)
    _cleanupLocalGraphs()
    _cleanupGlobalGraphs()
  })
}
