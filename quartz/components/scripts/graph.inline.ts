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
  // Strip trailing slash to avoid empty parts when splitting
  const normalizedTag = tag.endsWith("/") ? tag.slice(0, -1) : tag
  const tagPath = normalizedTag.replace(/^tags\//, "")
  const parts = tagPath.split("/")
  
  if (parts.length < 2) {
    return null
  }
  
  // For "engineering/typescript", return:
  // parent: "tags/engineering/", leaf: "tags/engineering/typescript/"
  // Both get trailing slashes to match simplified tag page format
  const parentPath = parts.slice(0, -1).join("/")
  return {
    parent: `tags/${parentPath}/` as SimpleSlug,
    leaf: tag,
  }
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Convert hex color to RGB components.
 * @param hex - Hex color string (e.g., "#FF5733")
 * @returns RGB components [r, g, b] in range [0, 255]
 */
function _hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0]
}

/**
 * Convert RGB components to hex color string.
 * @param r - Red component [0, 255]
 * @param g - Green component [0, 255]
 * @param b - Blue component [0, 255]
 * @returns Hex color string
 */
function _rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }).join("")
}

/**
 * Interpolate between multiple colors using a gradient.
 * @param colors - Array of hex color strings defining the gradient
 * @param t - Position in gradient [0, 1]
 * @returns Interpolated hex color
 */
function _lerpGradient(colors: string[], t: number): string {
  if (colors.length === 0) return "#888888"
  if (colors.length === 1) return colors[0]
  
  // Clamp t to [0, 1]
  t = Math.max(0, Math.min(1, t))
  
  // Find which two colors to interpolate between
  const scaledT = t * (colors.length - 1)
  const index = Math.floor(scaledT)
  const localT = scaledT - index
  
  // Handle edge case where t = 1
  if (index >= colors.length - 1) {
    return colors[colors.length - 1]
  }
  
  // Interpolate between the two colors
  const color1 = _hexToRgb(colors[index])
  const color2 = _hexToRgb(colors[index + 1])
  
  const r = color1[0] + (color2[0] - color1[0]) * localT
  const g = color1[1] + (color2[1] - color1[1]) * localT
  const b = color1[2] + (color2[2] - color1[2]) * localT
  
  return _rgbToHex(r, g, b)
}

/**
 * Build a map of tag file counts, where parent tags include counts from descendant tags.
 * This mirrors the totalFileCount logic from TagTrieNode.
 * @param data - Content data map
 * @param tags - All tag slugs in the graph
 * @returns Map from tag slug to total file count (including descendants)
 */
function _buildTagFileCountMap(
  data: Map<SimpleSlug, ContentDetails>,
  tags: SimpleSlug[],
): Map<SimpleSlug, number> {
  const fileCountMap = new Map<SimpleSlug, number>()
  
  // First, count direct file associations for each tag
  for (const tag of tags) {
    let count = 0
    
    // Count files that have this exact tag
    for (const [_, details] of data.entries()) {
      const fileTags = (details.tags ?? []).map((t) => {
        const slug = simplifySlug(("tags/" + t) as FullSlug)
        return slug.endsWith("/") ? slug : (slug + "/") as SimpleSlug
      })
      
      if (fileTags.includes(tag)) {
        count++
      }
    }
    
    fileCountMap.set(tag, count)
  }
  
  // Then, aggregate counts from descendants into parents
  // Sort tags by depth (deeper first) to ensure we process children before parents
  const sortedTags = [...tags].sort((a, b) => {
    const depthA = (a.match(/\//g) || []).length
    const depthB = (b.match(/\//g) || []).length
    return depthB - depthA
  })
  
  for (const tag of sortedTags) {
    const splitTag = _splitHierarchicalTag(tag)
    if (splitTag) {
      const childCount = fileCountMap.get(tag) || 0
      const parentCount = fileCountMap.get(splitTag.parent) || 0
      fileCountMap.set(splitTag.parent, parentCount + childCount)
    }
  }
  
  return fileCountMap
}

/**
 * Get the top-level tag from a tag slug.
 * @param tag - Tag slug (e.g., "tags/engineering/typescript")
 * @returns Top-level tag (e.g., "tags/engineering")
 */
function _getTopLevelTag(tag: SimpleSlug): SimpleSlug {
  const tagPath = tag.replace(/^tags\//, "")
  const parts = tagPath.split("/")
  return `tags/${parts[0]}` as SimpleSlug
}

/**
 * Build a mapping from tags to their assigned gradient colors.
 * @param tags - All tag slugs in the graph
 * @param gradient - Array of hex colors defining the gradient
 * @returns Map from tag slug to color
 */
function _buildTagColorMap(tags: SimpleSlug[], gradient: string[]): Map<SimpleSlug, string> {
  const colorMap = new Map<SimpleSlug, string>()
  
  // Find all top-level tags and sort alphabetically
  const topLevelTags = [...new Set(tags.map(_getTopLevelTag))].sort((a, b) => {
    const aPath = a.replace(/^tags\//, "")
    const bPath = b.replace(/^tags\//, "")
    return aPath.localeCompare(bPath, undefined, { numeric: true, sensitivity: "base" })
  })
  
  // Assign colors to top-level tags based on gradient position
  for (let i = 0; i < topLevelTags.length; i++) {
    const t = topLevelTags.length === 1 ? 0.5 : i / (topLevelTags.length - 1)
    const color = _lerpGradient(gradient, t)
    colorMap.set(topLevelTags[i], color)
  }
  
  // Assign colors to all descendant tags based on their top-level parent
  for (const tag of tags) {
    if (!colorMap.has(tag)) {
      const topLevel = _getTopLevelTag(tag)
      const color = colorMap.get(topLevel)
      if (color) {
        colorMap.set(tag, color)
      }
    }
  }
  
  return colorMap
}

/**
 * Calculate edge opacity based on distance from target linkDistance.
 * @param actualDistance - Current distance between nodes
 * @param targetDistance - Target link distance
 * @param minOpacity - Minimum opacity at 2x target distance
 * @param maxOpacity - Maximum opacity at 0.5x target distance
 * @returns Opacity value [minOpacity, maxOpacity]
 */
function _calculateEdgeOpacity(
  actualDistance: number,
  targetDistance: number,
  minOpacity: number,
  maxOpacity: number,
): number {
  // At 0.5x targetDistance: max opacity
  // At 1.0x targetDistance: midpoint opacity
  // At 2.0x targetDistance: min opacity
  
  const minDist = targetDistance * 0.5
  const maxDist = targetDistance * 2.0
  
  // Clamp distance to our range
  const clampedDist = Math.max(minDist, Math.min(maxDist, actualDistance))
  
  // Normalize to [0, 1] where 0 = minDist, 1 = maxDist
  const t = (clampedDist - minDist) / (maxDist - minDist)
  
  // Interpolate opacity (inverse: closer = more opaque)
  return maxOpacity - t * (maxOpacity - minOpacity)
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
        .map((tag) => {
          // Convert tag to slug format: "engineering" -> "tags/engineering/"
          // Add trailing slash to match format of simplified tag page slugs
          const slug = simplifySlug(("tags/" + tag) as FullSlug)
          return slug.endsWith("/") ? slug : (slug + "/") as SimpleSlug
        })

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
      // Remove trailing slash before processing to avoid empty segments
      const normalizedUrl = url.endsWith("/") ? url.slice(0, -1) : url
      const tagPath = normalizedUrl.substring(5)
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
 * Create node radius calculation function based on link count.
 * For parent tag nodes, aggregate connections from all descendant tags.
 * @param graphData - The graph data structure
 * @param baseSize - Base size configuration for tags and posts
 * @param tagFileCountMap - Map of tag slugs to their total file counts (including descendants)
 * @returns Function that calculates radius for a given node
 */
function _createNodeRadiusFunction(
  graphData: { nodes: NodeData[]; links: LinkData[] },
  baseSize: { tags: number; posts: number },
  tagFileCountMap: Map<SimpleSlug, number>,
) {
  return (d: NodeData): number => {
    // Use different base size for tags vs posts
    const base = d.id.startsWith("tags/") ? baseSize.tags : baseSize.posts
    
    // For tag nodes, use file count (including descendants)
    if (d.id.startsWith("tags/")) {
      const fileCount = tagFileCountMap.get(d.id) || 0
      return base + Math.sqrt(fileCount)
    }
    
    // For post nodes, use link count
    const numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id,
    ).length
    return base + Math.sqrt(numLinks)
  }
}

/**
 * Setup D3 force simulation with configured forces.
 * @param graphData - Graph data with nodes and links
 * @param nodeRadius - Function to calculate node radius
 * @param config - Force configuration values
 * @param linkDistance - Link distance configuration by type
 * @param linkStrength - Link strength configuration by type
 * @param enableRadial - Whether to enable radial force
 * @param width - Graph width
 * @param height - Graph height
 * @returns Configured D3 simulation
 */
function _setupSimulation(
  graphData: { nodes: NodeData[]; links: LinkData[] },
  nodeRadius: (d: NodeData) => number,
  config: { repelForce: number; centerForce: number },
  linkDistance: { tagTag: number; tagPost: number; postPost: number },
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
        .distance((link) => {
          const l = link as LinkData
          switch (l.type) {
            case "tag-tag":
              return linkDistance.tagTag
            case "tag-post":
              return linkDistance.tagPost
            case "post-post":
              return linkDistance.postPost
            default:
              return 30
          }
        })
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
 * @param tagColorMap - Map from tag slug to gradient color
 * @returns Function that calculates color for a given node
 */
function _createColorFunction(
  slug: SimpleSlug,
  visited: Set<SimpleSlug>,
  styleMap: Record<string, string>,
  tagColorMap: Map<SimpleSlug, string>,
) {
  return (d: NodeData): string => {
    const isCurrent = d.id === slug
    if (isCurrent) {
      return styleMap["--secondary"]
    } else if (d.id.startsWith("tags/")) {
      // Use gradient color for tag nodes
      return tagColorMap.get(d.id) ?? styleMap["--tertiary"]
    } else if (visited.has(d.id)) {
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
    preference: "webgl",
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
            // Find the corresponding node data to check if it's a tag
            const nodeData = nodeRenderData.find((n) => n.label === label)
            const isTagNode = nodeData?.simulationData.id.startsWith("tags/")
            
            // Tag labels stay opaque, post labels fade with zoom
            label.alpha = isTagNode ? 1 : scaleOpacity
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
 * @param linkDistanceConfig - Link distance configuration by type
 * @param edgeOpacityConfig - Min/max opacity configuration by link type
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
  linkDistanceConfig: { tagTag: number; tagPost: number; postPost: number },
  edgeOpacityConfig: {
    tagTag: { min: number; max: number };
    tagPost: { min: number; max: number };
    postPost: { min: number; max: number };
  },
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

    // Update link positions and calculate distance-based opacity
    for (const l of linkRenderData) {
      const linkData = l.simulationData
      const sx = linkData.source.x! + width / 2
      const sy = linkData.source.y! + height / 2
      const tx = linkData.target.x! + width / 2
      const ty = linkData.target.y! + height / 2
      
      // Calculate actual distance between nodes
      const dx = tx - sx
      const dy = ty - sy
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Get target distance and opacity config for this link type
      const targetDistance = 
        linkData.type === "tag-tag" ? linkDistanceConfig.tagTag :
        linkData.type === "tag-post" ? linkDistanceConfig.tagPost :
        linkDistanceConfig.postPost
      
      const opacityConfig = 
        linkData.type === "tag-tag" ? edgeOpacityConfig.tagTag :
        linkData.type === "tag-post" ? edgeOpacityConfig.tagPost :
        edgeOpacityConfig.postPost
      
      // Calculate opacity based on distance
      const baseOpacity = _calculateEdgeOpacity(distance, targetDistance, opacityConfig.min, opacityConfig.max)
      
      // Apply both base opacity and current alpha (for hover effects)
      const finalAlpha = baseOpacity * l.alpha
      
      l.gfx.clear()
      l.gfx.moveTo(sx, sy)
      l.gfx
        .lineTo(tx, ty)
        .stroke({ alpha: finalAlpha, width: 1, color: l.color })
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
    tagColorGradient,
    edgeOpacity,
    baseSize,
    labelAnchor,
  } = _parseGraphConfig(graph)

  // Parse linkDistance configuration (supports both number and object format)
  const linkDistanceConfig = typeof linkDistance === "number" 
    ? { tagTag: linkDistance, tagPost: linkDistance, postPost: linkDistance }
    : {
        tagTag: linkDistance?.tagTag ?? 30,
        tagPost: linkDistance?.tagPost ?? 30,
        postPost: linkDistance?.postPost ?? 30,
      }

  // Use default link strengths if not provided
  const linkStrengthConfig = {
    tagTag: linkStrength?.tagTag ?? 2.0,
    tagPost: linkStrength?.tagPost ?? 1.0,
    postPost: linkStrength?.postPost ?? 1.0,
  }

  // Use default gradient if not provided
  const gradient = tagColorGradient ?? ["#4CAF50", "#2196F3", "#9C27B0", "#FF9800"]
  
  // Parse edge opacity configuration (supports both per-type and legacy format)
  const edgeOpacityConfig = (() => {
    if (!edgeOpacity) {
      // Default values if nothing provided
      return {
        tagTag: { min: 0.3, max: 1.0 },
        tagPost: { min: 0.2, max: 1.0 },
        postPost: { min: 0.1, max: 0.8 },
      }
    }
    
    // Check if this is the new per-type format
    if ('tagTag' in edgeOpacity || 'tagPost' in edgeOpacity || 'postPost' in edgeOpacity) {
      const perTypeConfig = edgeOpacity as {
        tagTag?: { min?: number; max?: number }
        tagPost?: { min?: number; max?: number }
        postPost?: { min?: number; max?: number }
      }
      return {
        tagTag: { 
          min: perTypeConfig.tagTag?.min ?? 0.3, 
          max: perTypeConfig.tagTag?.max ?? 1.0 
        },
        tagPost: { 
          min: perTypeConfig.tagPost?.min ?? 0.2, 
          max: perTypeConfig.tagPost?.max ?? 1.0 
        },
        postPost: { 
          min: perTypeConfig.postPost?.min ?? 0.1, 
          max: perTypeConfig.postPost?.max ?? 0.8 
        },
      }
    }
    
    // Legacy format: apply same values to all link types
    const legacyConfig = edgeOpacity as { min?: number; max?: number }
    const legacyMin = legacyConfig.min ?? 0.2
    const legacyMax = legacyConfig.max ?? 1.0
    return {
      tagTag: { min: legacyMin, max: legacyMax },
      tagPost: { min: legacyMin, max: legacyMax },
      postPost: { min: legacyMin, max: legacyMax },
    }
  })()

  // Parse baseSize configuration (supports both number and object format)
  const baseSizeConfig = typeof baseSize === "number"
    ? { tags: baseSize, posts: baseSize }
    : {
        tags: baseSize?.tags ?? 4,
        posts: baseSize?.posts ?? 2,
      }

  // Parse labelAnchor configuration
  const labelAnchorConfig = {
    baseY: labelAnchor?.baseY ?? 1.2,
    scaleFactor: labelAnchor?.scaleFactor ?? 0.05,
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

  // Build tag file count map (includes descendant counts for parent tags)
  const tagFileCountMap = _buildTagFileCountMap(data, tags)

  // Build tag color mapping from gradient
  const tagColorMap = _buildTagColorMap(tags, gradient)

  // Setup dimensions and simulation
  const width = graph.offsetWidth
  const height = Math.max(graph.offsetHeight, 250)
  const nodeRadius = _createNodeRadiusFunction(graphData, baseSizeConfig, tagFileCountMap)
  const simulation = _setupSimulation(
    graphData,
    nodeRadius,
    { repelForce, centerForce },
    linkDistanceConfig,
    linkStrengthConfig,
    enableRadial ?? false,
    width,
    height,
  )

  // Precompute CSS variables for Pixi rendering
  const computedStyleMap = _getComputedStyleMap()
  const color = _createColorFunction(slug, visited, computedStyleMap, tagColorMap)

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

    const isTagNode = nodeId.startsWith("tags/")
    
    // Calculate initial label opacity based on node type and zoom scale
    const initialOpacity = isTagNode ? 1 : Math.max((scale * opacityScale - 1) / 3.75, 0)
    
    // Calculate label y-anchor based on node radius to prevent overlap
    const radius = nodeRadius(n)
    // Scale the anchor adjustment with node size (larger nodes push label further down)
    const yAnchor = labelAnchorConfig.baseY + (radius - 2) * labelAnchorConfig.scaleFactor
    
    const label = new Text({
      interactive: false,
      eventMode: "none",
      text: n.text,
      alpha: initialOpacity,
      anchor: { x: 0.5, y: yAnchor },
      style: {
        fontSize: fontSize * 15,
        fill: computedStyleMap["--dark"],
        fontFamily: computedStyleMap["--bodyFont"],
      },
      resolution: window.devicePixelRatio * 4,
    })
    label.scale.set(1 / scale)

    let oldLabelOpacity = initialOpacity
    const nodeColor = color(n)
    const gfx = new Graphics({
      interactive: true,
      label: nodeId,
      eventMode: "static",
      hitArea: new Circle(0, 0, radius),
      cursor: "pointer",
    })
      .circle(0, 0, radius)
      .fill({ color: isTagNode ? computedStyleMap["--light"] : nodeColor })
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
      // Use the gradient color for the stroke (border)
      gfx.stroke({ width: 2, color: nodeColor })
    }

    nodesContainer.addChild(gfx)
    labelsContainer.addChild(label)

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      label,
      color: nodeColor,
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
  return _startAnimationLoop(
    nodeRenderData,
    linkRenderData,
    tweens,
    app,
    stage,
    width,
    height,
    linkDistanceConfig,
    edgeOpacityConfig,
  )
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
