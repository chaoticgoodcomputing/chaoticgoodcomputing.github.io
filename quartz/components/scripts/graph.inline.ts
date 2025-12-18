import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import {
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceRadial,
  zoomIdentity,
  select,
  drag,
  zoom,
} from "d3"
import { Text, Graphics, Application, Container, Circle } from "pixi.js"
import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js"
import { registerEscapeHandler, removeAllChildren } from "./util"
import { FullSlug, SimpleSlug, getFullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { D3Config } from "../Graph"

/** Graphics rendering information for nodes and links */
type GraphicsInfo = {
  color: string
  gfx: Graphics
  alpha: number
  active: boolean
}

/** Link type classification */
type LinkType = "tag-tag" | "tag-post" | "post-post"

/** Node data for graph simulation */
type NodeData = {
  id: SimpleSlug
  text: string
  tags: string[]
} & SimulationNodeDatum

/** Simple link data before simulation processing */
type SimpleLinkData = {
  source: SimpleSlug
  target: SimpleSlug
  type: LinkType
}

/** Link data for graph simulation */
type LinkData = {
  source: NodeData
  target: NodeData
  type: LinkType
} & SimulationLinkDatum<NodeData>

/** Link rendering data including graphics info */
type LinkRenderData = GraphicsInfo & {
  simulationData: LinkData
}

/** Node rendering data including graphics info and label */
type NodeRenderData = GraphicsInfo & {
  simulationData: NodeData
  label: Text
}

/** Tween animation node */
type TweenNode = {
  update: (time: number) => void
  stop: () => void
}

const localStorageKey = "graph-visited"

let localGraphCleanups: (() => void)[] = []
let globalGraphCleanups: (() => void)[] = []


/**
 * Get the set of visited pages from localStorage
 */
function _getVisited(): Set<SimpleSlug> {
  return new Set(JSON.parse(localStorage.getItem(localStorageKey) ?? "[]"))
}

/**
 * Add a page slug to the visited set
 */
function _addToVisited(slug: SimpleSlug) {
  const visited = _getVisited()
  visited.add(slug)
  localStorage.setItem(localStorageKey, JSON.stringify([...visited]))
}

// ============================================================================
// DATA TRANSFORMATION HELPERS
// ============================================================================

/**
 * Parse graph configuration from dataset attributes.
 * @param graph - The graph container element
 * @returns The parsed D3Config object
 */
function _parseGraphConfig(graph: HTMLElement): D3Config {
  return JSON.parse(graph.dataset["cfg"]!) as D3Config
}

/**
 * Fetch and transform content index data for graph rendering.
 * @returns A Map of simplified slugs to content metadata
 */
async function _fetchAndTransformData(): Promise<Map<SimpleSlug, ContentDetails>> {
  const index = await fetchData
  return new Map(
    Object.entries<ContentDetails>(index).map(([k, v]) => [
      simplifySlug(k as FullSlug),
      v,
    ]),
  )
}

/**
 * Split a hierarchical tag into parent and child parts.
 * @param tag - Tag slug (e.g., "tags/engineering/typescript")
 * @returns Object with parent and leaf slugs, or null if not hierarchical
 */
function _splitHierarchicalTag(tag: SimpleSlug): { parent: SimpleSlug; leaf: SimpleSlug } | null {
  const tagPath = tag.replace(/^tags\//, "")
  const parts = tagPath.split("/")
  
  if (parts.length < 2) {
    return null
  }
  
  // For "engineering/typescript", return:
  // parent: "tags/engineering", leaf: "tags/engineering/typescript"
  const parentPath = parts.slice(0, -1).join("/")
  return {
    parent: `tags/${parentPath}` as SimpleSlug,
    leaf: tag,
  }
}

/**
 * Build links array and collect tags from content data.
 * @param data - The content data map
 * @param showTags - Whether to include tags in the graph
 * @param removeTags - Tags to exclude from the graph
 * @returns Object containing links and tags arrays
 */
function _buildLinksAndTags(
  data: Map<SimpleSlug, ContentDetails>,
  showTags: boolean,
  removeTags: string[],
): { links: SimpleLinkData[]; tags: SimpleSlug[] } {
  const links: SimpleLinkData[] = []
  const tags: SimpleSlug[] = []
  const validLinks = new Set(data.keys())
  const parentChildPairs = new Set<string>() // Track unique parent-child connections

  for (const [source, details] of data.entries()) {
    const outgoing = details.links ?? []

    for (const dest of outgoing) {
      if (validLinks.has(dest)) {
        links.push({ source: source, target: dest, type: "post-post" })
      }
    }

    if (showTags) {
      const localTags = (details.tags ?? [])
        .filter((tag) => !removeTags.includes(tag))
        .map((tag) => simplifySlug(("tags/" + tag) as FullSlug))

      for (const tag of localTags) {
        // Add the leaf tag node if not already present
        if (!tags.includes(tag)) {
          tags.push(tag)
        }

        // Check if this is a hierarchical tag
        const splitTag = _splitHierarchicalTag(tag)
        
        if (splitTag) {
          // Add parent tag node if not already present
          if (!tags.includes(splitTag.parent)) {
            tags.push(splitTag.parent)
          }

          // Create strong connection between parent and child nodes
          const pairKey = `${splitTag.parent}→${splitTag.leaf}`
          if (!parentChildPairs.has(pairKey)) {
            links.push({ source: splitTag.parent, target: splitTag.leaf, type: "tag-tag" })
            parentChildPairs.add(pairKey)
          }

          // Posts connect to the LEAF node, not the parent
          links.push({ source: source, target: splitTag.leaf, type: "tag-post" })
        } else {
          // Non-hierarchical tag: post connects directly to tag
          links.push({ source: source, target: tag, type: "tag-post" })
        }
      }
    }
  }

  return { links, tags }
}

/**
 * Calculate neighborhood of nodes within specified depth using BFS.
 * Uses sentinel value to track depth levels during traversal.
 * @param slug - Starting node slug
 * @param links - All links in the graph
 * @param validLinks - Set of valid node IDs
 * @param tags - Tag nodes to include
 * @param depth - Maximum depth to traverse (-1 for all nodes)
 * @param showTags - Whether tags should be included
 * @returns Set of node IDs within the specified depth
 */
function _calculateNeighborhood(
  slug: SimpleSlug,
  links: SimpleLinkData[],
  validLinks: Set<SimpleSlug>,
  tags: SimpleSlug[],
  depthLimit: number,
  showTags: boolean,
): Set<SimpleSlug> {
  const neighbourhood = new Set<SimpleSlug>()
  const wl: (SimpleSlug | "__SENTINEL")[] = [slug, "__SENTINEL"]
  let depth = depthLimit

  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      const cur = wl.shift()!
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbourhood.add(cur)
        const outgoing = links.filter((l) => l.source === cur)
        const incoming = links.filter((l) => l.target === cur)
        wl.push(...outgoing.map((l) => l.target), ...incoming.map((l) => l.source))
      }
    }
  } else {
    validLinks.forEach((id) => neighbourhood.add(id))
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag))
  }

  return neighbourhood
}

/**
 * Construct graph nodes from neighborhood set.
 * @param neighbourhood - Set of node IDs to include
 * @param data - Content data map for titles and tags
 * @returns Array of NodeData objects
 */
function _constructGraphNodes(
  neighbourhood: Set<SimpleSlug>,
  data: Map<SimpleSlug, ContentDetails>,
): NodeData[] {
  return [...neighbourhood].map((url) => {
    if (url.startsWith("tags/")) {
      const tagPath = url.substring(5)
      const parts = tagPath.split("/")
      // Display only the last segment for hierarchical tags
      const displayName = parts[parts.length - 1]
      return {
        id: url,
        text: "#" + displayName,
        tags: data.get(url)?.tags ?? [],
      }
    } else {
      return {
        id: url,
        text: data.get(url)?.title ?? url,
        tags: data.get(url)?.tags ?? [],
      }
    }
  })
}

/**
 * Construct complete graph data structure with nodes and links.
 * @param nodes - Node data array
 * @param links - Simple link data array
 * @param neighbourhood - Set of valid node IDs
 * @returns Graph data with typed nodes and links
 */
function _constructGraphData(
  nodes: NodeData[],
  links: SimpleLinkData[],
  neighbourhood: Set<SimpleSlug>,
): { nodes: NodeData[]; links: LinkData[] } {
  return {
    nodes,
    links: links
      .filter((l) => neighbourhood.has(l.source) && neighbourhood.has(l.target))
      .map((l) => ({
        source: nodes.find((n) => n.id === l.source)!,
        target: nodes.find((n) => n.id === l.target)!,
        type: l.type,
      })),
  }
}

// ============================================================================
// SIMULATION SETUP HELPERS
// ============================================================================

/**
 * Get all descendant tag nodes for a given parent tag.
 * @param parentTag - Parent tag slug (e.g., "tags/engineering")
 * @param allNodes - All nodes in the graph
 * @returns Array of descendant tag node IDs
 */
function _getDescendantTags(parentTag: SimpleSlug, allNodes: NodeData[]): SimpleSlug[] {
  const parentPath = parentTag.substring(5) // Remove "tags/" prefix
  return allNodes
    .filter((n) => {
      if (!n.id.startsWith("tags/")) return false
      const nodePath = n.id.substring(5)
      // Check if this node is a descendant (starts with parent path + "/")
      return nodePath.startsWith(parentPath + "/")
    })
    .map((n) => n.id)
}

/**
 * Create node radius calculation function based on link count.
 * For parent tag nodes, aggregate connections from all descendant tags.
 * @param graphData - The graph data structure
 * @returns Function that calculates radius for a given node
 */
function _createNodeRadiusFunction(graphData: { nodes: NodeData[]; links: LinkData[] }) {
  return (d: NodeData): number => {
    let numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id,
    ).length

    // If this is a tag node, check if it has descendants
    if (d.id.startsWith("tags/")) {
      const descendants = _getDescendantTags(d.id, graphData.nodes)
      
      // Add connections from all descendants, excluding parent-child links
      for (const descendantId of descendants) {
        const descendantLinks = graphData.links.filter(
          (l) => {
            const isDescendantLink = l.source.id === descendantId || l.target.id === descendantId
            // Don't count the parent-child connection itself
            const isParentChildLink = 
              (l.source.id === d.id && l.target.id === descendantId) ||
              (l.source.id === descendantId && l.target.id === d.id)
            // Don't count links between descendants
            const isDescendantToDescendantLink =
              descendants.includes(l.source.id) && descendants.includes(l.target.id)
            
            return isDescendantLink && !isParentChildLink && !isDescendantToDescendantLink
          }
        ).length
        
        numLinks += descendantLinks
      }
    }

    return 2 + Math.sqrt(numLinks)
  }
}

/**
 * Setup D3 force simulation with configured forces.
 * @param graphData - Graph data with nodes and links
 * @param nodeRadius - Function to calculate node radius
 * @param config - Force configuration values
 * @param linkStrength - Link strength configuration by type
 * @param enableRadial - Whether to enable radial force
 * @param width - Graph width
 * @param height - Graph height
 * @returns Configured D3 simulation
 */
function _setupSimulation(
  graphData: { nodes: NodeData[]; links: LinkData[] },
  nodeRadius: (d: NodeData) => number,
  config: { repelForce: number; centerForce: number; linkDistance: number },
  linkStrength: { tagTag: number; tagPost: number; postPost: number },
  enableRadial: boolean,
  width: number,
  height: number,
): Simulation<NodeData, LinkData> {
  const simulation = forceSimulation<NodeData>(graphData.nodes)
    .force("charge", forceManyBody().strength(-100 * config.repelForce))
    .force("center", forceCenter().strength(config.centerForce))
    .force(
      "link",
      forceLink(graphData.links)
        .distance(config.linkDistance)
        .strength((link) => {
          const l = link as LinkData
          switch (l.type) {
            case "tag-tag":
              return linkStrength.tagTag
            case "tag-post":
              return linkStrength.tagPost
            case "post-post":
              return linkStrength.postPost
            default:
              return 1.0
          }
        }),
    )
    .force("collide", forceCollide<NodeData>(nodeRadius).iterations(3))

  if (enableRadial) {
    const radius = (Math.min(width, height) / 2) * 0.8
    simulation.force("radial", forceRadial(radius).strength(0.2))
  }

  return simulation
}

/**
 * Get computed CSS variable values for Pixi rendering.
 * Pixi doesn't support CSS variables, so we precompute them.
 * @returns Map of CSS variable names to computed values
 */
function _getComputedStyleMap(): Record<string, string> {
  const cssVars = [
    "--secondary",
    "--tertiary",
    "--gray",
    "--light",
    "--lightgray",
    "--dark",
    "--darkgray",
    "--bodyFont",
  ] as const

  return cssVars.reduce(
    (acc, key) => {
      acc[key] = getComputedStyle(document.documentElement).getPropertyValue(key)
      return acc
    },
    {} as Record<(typeof cssVars)[number], string>,
  )
}

/**
 * Create node color calculation function.
 * @param slug - Current page slug
 * @param visited - Set of visited page slugs
 * @param styleMap - Computed CSS variable values
 * @returns Function that calculates color for a given node
 */
function _createColorFunction(
  slug: SimpleSlug,
  visited: Set<SimpleSlug>,
  styleMap: Record<string, string>,
) {
  return (d: NodeData): string => {
    const isCurrent = d.id === slug
    if (isCurrent) {
      return styleMap["--secondary"]
    } else if (visited.has(d.id) || d.id.startsWith("tags/")) {
      return styleMap["--tertiary"]
    } else {
      return styleMap["--gray"]
    }
  }
}

// ============================================================================
// ANIMATION AND RENDERING HELPERS
// ============================================================================

/**
 * Shared hover state management for node and link highlighting.
 */
type HoverState = {
  hoveredNodeId: string | null
  hoveredNeighbours: Set<string>
  dragStartTime: number
  dragging: boolean
}

/**
 * Update hover state and mark active nodes/links.
 * @param state - Hover state object
 * @param linkRenderData - Array of link render data
 * @param nodeRenderData - Array of node render data
 * @param newHoveredId - ID of newly hovered node (or null)
 */
function _updateHoverInfo(
  state: HoverState,
  linkRenderData: LinkRenderData[],
  nodeRenderData: NodeRenderData[],
  newHoveredId: string | null,
) {
  state.hoveredNodeId = newHoveredId

  if (newHoveredId === null) {
    state.hoveredNeighbours = new Set()
    for (const n of nodeRenderData) {
      n.active = false
    }
    for (const l of linkRenderData) {
      l.active = false
    }
  } else {
    state.hoveredNeighbours = new Set()
    for (const l of linkRenderData) {
      const linkData = l.simulationData
      if (linkData.source.id === newHoveredId || linkData.target.id === newHoveredId) {
        state.hoveredNeighbours.add(linkData.source.id)
        state.hoveredNeighbours.add(linkData.target.id)
      }
      l.active = linkData.source.id === newHoveredId || linkData.target.id === newHoveredId
    }
    for (const n of nodeRenderData) {
      n.active = state.hoveredNeighbours.has(n.simulationData.id)
    }
  }
}

/**
 * Create tween animations for link highlighting.
 * @param tweens - Map of active tween animations
 * @param linkRenderData - Array of link render data
 * @param hoveredNodeId - Currently hovered node ID
 * @param styleMap - Computed CSS variables
 */
function _renderLinks(
  tweens: Map<string, TweenNode>,
  linkRenderData: LinkRenderData[],
  hoveredNodeId: string | null,
  styleMap: Record<string, string>,
) {
  tweens.get("link")?.stop()
  const tweenGroup = new TweenGroup()

  for (const l of linkRenderData) {
    let alpha = 1
    if (hoveredNodeId) {
      alpha = l.active ? 1 : 0.2
    }
    l.color = l.active ? styleMap["--gray"] : styleMap["--lightgray"]
    tweenGroup.add(new Tweened<LinkRenderData>(l).to({ alpha }, 200))
  }

  tweenGroup.getAll().forEach((tw) => tw.start())
  tweens.set("link", {
    update: tweenGroup.update.bind(tweenGroup),
    stop() {
      tweenGroup.getAll().forEach((tw) => tw.stop())
    },
  })
}

/**
 * Create tween animations for label scaling and fading.
 * @param tweens - Map of active tween animations
 * @param nodeRenderData - Array of node render data
 * @param hoveredNodeId - Currently hovered node ID
 * @param scale - Current zoom scale
 */
function _renderLabels(
  tweens: Map<string, TweenNode>,
  nodeRenderData: NodeRenderData[],
  hoveredNodeId: string | null,
  scale: number,
) {
  tweens.get("label")?.stop()
  const tweenGroup = new TweenGroup()

  const defaultScale = 1 / scale
  const activeScale = defaultScale * 1.1
  for (const n of nodeRenderData) {
    const nodeId = n.simulationData.id
    if (hoveredNodeId === nodeId) {
      tweenGroup.add(
        new Tweened<Text>(n.label).to(
          {
            alpha: 1,
            scale: { x: activeScale, y: activeScale },
          },
          100,
        ),
      )
    } else {
      tweenGroup.add(
        new Tweened<Text>(n.label).to(
          {
            alpha: n.label.alpha,
            scale: { x: defaultScale, y: defaultScale },
          },
          100,
        ),
      )
    }
  }

  tweenGroup.getAll().forEach((tw) => tw.start())
  tweens.set("label", {
    update: tweenGroup.update.bind(tweenGroup),
    stop() {
      tweenGroup.getAll().forEach((tw) => tw.stop())
    },
  })
}

/**
 * Create tween animations for node highlighting on hover.
 * @param tweens - Map of active tween animations
 * @param nodeRenderData - Array of node render data
 * @param hoveredNodeId - Currently hovered node ID
 * @param focusOnHover - Whether to focus on hovered node
 */
function _renderNodes(
  tweens: Map<string, TweenNode>,
  nodeRenderData: NodeRenderData[],
  hoveredNodeId: string | null,
  focusOnHover: boolean,
) {
  tweens.get("hover")?.stop()
  const tweenGroup = new TweenGroup()

  for (const n of nodeRenderData) {
    let alpha = 1
    if (hoveredNodeId !== null && focusOnHover) {
      alpha = n.active ? 1 : 0.2
    }
    tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha }, 200))
  }

  tweenGroup.getAll().forEach((tw) => tw.start())
  tweens.set("hover", {
    update: tweenGroup.update.bind(tweenGroup),
    stop() {
      tweenGroup.getAll().forEach((tw) => tw.stop())
    },
  })
}

/**
 * Render all Pixi elements using D3 simulation data.
 * Orchestrates node, link, and label rendering.
 * @param tweens - Map of active tween animations
 * @param linkRenderData - Array of link render data
 * @param nodeRenderData - Array of node render data
 * @param hoveredNodeId - Currently hovered node ID
 * @param styleMap - Computed CSS variables
 * @param scale - Current zoom scale
 * @param focusOnHover - Whether to focus on hovered node
 */
function _renderPixiFromD3(
  tweens: Map<string, TweenNode>,
  linkRenderData: LinkRenderData[],
  nodeRenderData: NodeRenderData[],
  hoveredNodeId: string | null,
  styleMap: Record<string, string>,
  scale: number,
  focusOnHover: boolean,
) {
  _renderNodes(tweens, nodeRenderData, hoveredNodeId, focusOnHover)
  _renderLinks(tweens, linkRenderData, hoveredNodeId, styleMap)
  _renderLabels(tweens, nodeRenderData, hoveredNodeId, scale)
}

// ============================================================================
// PIXI SETUP HELPERS
// ============================================================================

/**
 * Create and initialize Pixi application.
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Initialized Pixi application
 */
async function _createPixiApp(width: number, height: number): Promise<Application> {
  const app = new Application()
  await app.init({
    width,
    height,
    antialias: true,
    autoStart: false,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: "webgpu",
    resolution: window.devicePixelRatio,
    eventMode: "static",
  })
  return app
}

/**
 * Setup Pixi container hierarchy for layered rendering.
 * @param stage - Pixi stage
 * @returns Object with containers for labels, nodes, and links
 */
function _setupPixiContainers(stage: Container) {
  const labelsContainer = new Container<Text>({ zIndex: 3, isRenderGroup: true })
  const nodesContainer = new Container<Graphics>({ zIndex: 2, isRenderGroup: true })
  const linkContainer = new Container<Graphics>({ zIndex: 1, isRenderGroup: true })
  stage.addChild(nodesContainer, labelsContainer, linkContainer)
  return { labelsContainer, nodesContainer, linkContainer }
}

// ============================================================================
// INTERACTION HELPERS
// ============================================================================

/**
 * Setup drag behavior for nodes.
 * @param canvas - Pixi canvas element
 * @param graphData - Graph data with nodes
 * @param hoverState - Hover state object
 * @param simulation - D3 simulation
 * @param fullSlug - Full page slug for navigation
 */
function _setupDragBehavior(
  canvas: HTMLCanvasElement,
  graphData: { nodes: NodeData[]; links: LinkData[] },
  hoverState: HoverState,
  simulation: Simulation<NodeData, LinkData>,
  fullSlug: FullSlug,
) {
  let currentTransform = zoomIdentity

  select<HTMLCanvasElement, NodeData | undefined>(canvas).call(
    drag<HTMLCanvasElement, NodeData | undefined>()
      .container(() => canvas)
      .subject(() => graphData.nodes.find((n) => n.id === hoverState.hoveredNodeId))
      .on("start", function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(1).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
        event.subject.__initialDragPos = {
          x: event.subject.x,
          y: event.subject.y,
          fx: event.subject.fx,
          fy: event.subject.fy,
        }
        hoverState.dragStartTime = Date.now()
        hoverState.dragging = true
      })
      .on("drag", function dragged(event) {
        const initPos = event.subject.__initialDragPos
        event.subject.fx = initPos.x + (event.x - initPos.x) / currentTransform.k
        event.subject.fy = initPos.y + (event.y - initPos.y) / currentTransform.k
      })
      .on("end", function dragended(event) {
        if (!event.active) simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
        hoverState.dragging = false

        // if the time between mousedown and mouseup is short, we consider it a click
        if (Date.now() - hoverState.dragStartTime < 500) {
          const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
          const targ = resolveRelative(fullSlug, node.id)
          window.spaNavigate(new URL(targ, window.location.toString()))
        }
      }),
  )

  return { currentTransform }
}

/**
 * Setup click behavior when drag is disabled.
 * @param nodeRenderData - Array of node render data
 * @param fullSlug - Full page slug for navigation
 */
function _setupClickBehavior(nodeRenderData: NodeRenderData[], fullSlug: FullSlug) {
  for (const node of nodeRenderData) {
    node.gfx.on("click", () => {
      const targ = resolveRelative(fullSlug, node.simulationData.id)
      window.spaNavigate(new URL(targ, window.location.toString()))
    })
  }
}

/**
 * Setup zoom behavior for the graph.
 * @param canvas - Pixi canvas element
 * @param stage - Pixi stage
 * @param width - Canvas width
 * @param height - Canvas height
 * @param opacityScale - Scale factor for label opacity
 * @param labelsContainer - Container with label elements
 * @param nodeRenderData - Array of node render data
 * @returns Object with mutable currentTransform reference
 */
function _setupZoomBehavior(
  canvas: HTMLCanvasElement,
  stage: Container,
  width: number,
  height: number,
  opacityScale: number,
  labelsContainer: Container<Text>,
  nodeRenderData: NodeRenderData[],
) {
  let currentTransform = zoomIdentity

  select<HTMLCanvasElement, NodeData>(canvas).call(
    zoom<HTMLCanvasElement, NodeData>()
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([0.25, 4])
      .on("zoom", ({ transform }) => {
        currentTransform = transform
        stage.scale.set(transform.k, transform.k)
        stage.position.set(transform.x, transform.y)

        // zoom adjusts opacity of labels too
        const scale = transform.k * opacityScale
        let scaleOpacity = Math.max((scale - 1) / 3.75, 0)
        const activeNodes = nodeRenderData.filter((n) => n.active).flatMap((n) => n.label)

        for (const label of labelsContainer.children) {
          if (!activeNodes.includes(label)) {
            label.alpha = scaleOpacity
          }
        }
      }),
  )

  return { currentTransform }
}

/**
 * Start animation loop that updates node/link positions and renders tweens.
 * @param nodeRenderData - Array of node render data
 * @param linkRenderData - Array of link render data
 * @param tweens - Map of active tween animations
 * @param app - Pixi application
 * @param stage - Pixi stage
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Cleanup function to stop animation
 */
function _startAnimationLoop(
  nodeRenderData: NodeRenderData[],
  linkRenderData: LinkRenderData[],
  tweens: Map<string, TweenNode>,
  app: Application,
  stage: Container,
  width: number,
  height: number,
): () => void {
  let stopAnimation = false

  function animate(time: number) {
    if (stopAnimation) return

    // Update node positions
    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData
      if (!x || !y) continue
      n.gfx.position.set(x + width / 2, y + height / 2)
      if (n.label) {
        n.label.position.set(x + width / 2, y + height / 2)
      }
    }

    // Update link positions
    for (const l of linkRenderData) {
      const linkData = l.simulationData
      l.gfx.clear()
      l.gfx.moveTo(linkData.source.x! + width / 2, linkData.source.y! + height / 2)
      l.gfx
        .lineTo(linkData.target.x! + width / 2, linkData.target.y! + height / 2)
        .stroke({ alpha: l.alpha, width: 1, color: l.color })
    }

    // Update tweens and render
    tweens.forEach((t) => t.update(time))
    app.renderer.render(stage)
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)

  return () => {
    stopAnimation = true
    app.destroy()
  }
}

async function renderGraph(graph: HTMLElement, fullSlug: FullSlug) {
  const slug = simplifySlug(fullSlug)
  const visited = _getVisited()
  removeAllChildren(graph)

  // Parse configuration
  const {
    drag: enableDrag,
    zoom: enableZoom,
    depth,
    scale,
    repelForce,
    centerForce,
    linkDistance,
    fontSize,
    opacityScale,
    removeTags,
    showTags,
    focusOnHover,
    enableRadial,
    linkStrength,
  } = _parseGraphConfig(graph)

  // Use default link strengths if not provided
  const linkStrengthConfig = {
    tagTag: linkStrength?.tagTag ?? 2.0,
    tagPost: linkStrength?.tagPost ?? 1.0,
    postPost: linkStrength?.postPost ?? 1.0,
  }

  // Fetch and transform data
  const data = await _fetchAndTransformData()
  const { links, tags } = _buildLinksAndTags(data, showTags, removeTags)
  const validLinks = new Set(data.keys())

  // Calculate neighborhood using BFS
  const neighbourhood = _calculateNeighborhood(slug, links, validLinks, tags, depth, showTags)

  // Initialize tween animation tracker
  const tweens = new Map<string, TweenNode>()

  // Construct graph nodes and data structure
  const nodes = _constructGraphNodes(neighbourhood, data)
  const graphData = _constructGraphData(nodes, links, neighbourhood)

  // Setup dimensions and simulation
  const width = graph.offsetWidth
  const height = Math.max(graph.offsetHeight, 250)
  const nodeRadius = _createNodeRadiusFunction(graphData)
  const simulation = _setupSimulation(
    graphData,
    nodeRadius,
    { repelForce, centerForce, linkDistance },
    linkStrengthConfig,
    enableRadial ?? false,
    width,
    height,
  )

  // Precompute CSS variables for Pixi rendering
  const computedStyleMap = _getComputedStyleMap()
  const color = _createColorFunction(slug, visited, computedStyleMap)

  // Initialize hover state
  const hoverState: HoverState = {
    hoveredNodeId: null,
    hoveredNeighbours: new Set(),
    dragStartTime: 0,
    dragging: false,
  }
  const linkRenderData: LinkRenderData[] = []
  const nodeRenderData: NodeRenderData[] = []

  // Create closure for updating hover state
  const updateHoverInfo = (newHoveredId: string | null) => {
    _updateHoverInfo(hoverState, linkRenderData, nodeRenderData, newHoveredId)
  }

  // Create closure for rendering all Pixi elements
  const renderPixiFromD3 = () => {
    _renderPixiFromD3(
      tweens,
      linkRenderData,
      nodeRenderData,
      hoverState.hoveredNodeId,
      computedStyleMap,
      scale,
      focusOnHover ?? false,
    )
  }

  // Stop existing animations and create Pixi app
  tweens.forEach((tween) => tween.stop())
  tweens.clear()

  const app = await _createPixiApp(width, height)
  graph.appendChild(app.canvas)

  const stage = app.stage
  stage.interactive = false

  const { labelsContainer, nodesContainer, linkContainer } = _setupPixiContainers(stage)

  for (const n of graphData.nodes) {
    const nodeId = n.id

    const label = new Text({
      interactive: false,
      eventMode: "none",
      text: n.text,
      alpha: 0,
      anchor: { x: 0.5, y: 1.2 },
      style: {
        fontSize: fontSize * 15,
        fill: computedStyleMap["--dark"],
        fontFamily: computedStyleMap["--bodyFont"],
      },
      resolution: window.devicePixelRatio * 4,
    })
    label.scale.set(1 / scale)

    let oldLabelOpacity = 0
    const isTagNode = nodeId.startsWith("tags/")
    const gfx = new Graphics({
      interactive: true,
      label: nodeId,
      eventMode: "static",
      hitArea: new Circle(0, 0, nodeRadius(n)),
      cursor: "pointer",
    })
      .circle(0, 0, nodeRadius(n))
      .fill({ color: isTagNode ? computedStyleMap["--light"] : color(n) })
      .on("pointerover", (e) => {
        updateHoverInfo(e.target.label)
        oldLabelOpacity = label.alpha
        if (!hoverState.dragging) {
          renderPixiFromD3()
        }
      })
      .on("pointerleave", () => {
        updateHoverInfo(null)
        label.alpha = oldLabelOpacity
        if (!hoverState.dragging) {
          renderPixiFromD3()
        }
      })

    if (isTagNode) {
      gfx.stroke({ width: 2, color: computedStyleMap["--tertiary"] })
    }

    nodesContainer.addChild(gfx)
    labelsContainer.addChild(label)

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      label,
      color: color(n),
      alpha: 1,
      active: false,
    }

    nodeRenderData.push(nodeRenderDatum)
  }

  for (const l of graphData.links) {
    const gfx = new Graphics({ interactive: false, eventMode: "none" })
    linkContainer.addChild(gfx)

    const linkRenderDatum: LinkRenderData = {
      simulationData: l,
      gfx,
      color: computedStyleMap["--lightgray"],
      alpha: 1,
      active: false,
    }

    linkRenderData.push(linkRenderDatum)
  }

  // Setup interaction behaviors
  if (enableDrag) {
    _setupDragBehavior(app.canvas, graphData, hoverState, simulation, fullSlug)
  } else {
    _setupClickBehavior(nodeRenderData, fullSlug)
  }

  if (enableZoom) {
    _setupZoomBehavior(
      app.canvas,
      stage,
      width,
      height,
      opacityScale,
      labelsContainer,
      nodeRenderData,
    )
  }

  // Start animation loop
  return _startAnimationLoop(nodeRenderData, linkRenderData, tweens, app, stage, width, height)
}

/**
 * Clean up all local graph instances
 */
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

// MARK: MAIN

/**
 * Initialize and render graphs on page navigation
 */
document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const slug = e.detail.url
  _addToVisited(simplifySlug(slug))

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
})
