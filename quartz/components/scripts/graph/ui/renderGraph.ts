import { removeAllChildren } from "../../util"
import { FullSlug, SimpleSlug, simplifySlug } from "../../../../util/path"
import { IconService } from "../../../../util/iconService"
import {
  buildLinksAndTags,
  fetchTagIndex,
  buildGraphColorMap,
  buildGraphCountMap,
  getAllIconsFromTagIndex,
  calculateNeighborhood,
  constructGraphData,
  constructGraphNodes,
  createNodeRadiusFunction,
  fetchAndTransformData,
  parseGraphConfig,
  setupSimulation,
  HoverState,
  TweenManager,
} from "../core"
import { getVisited } from "../adapters/visited"
import { LinkRenderData, NodeRenderData } from "../core/renderTypes"
import { createPixiApp, setupPixiContainers } from "./pixiSetup"
import { getComputedStyleMap, createColorFunction } from "./styles"
import { createNode, createLink } from "./nodeFactory"
import { renderPixiFromD3, startAnimationLoop } from "./rendering"
import { setupDragBehavior, setupClickBehavior, setupZoomBehavior } from "../adapters/d3Behaviors"
import {
  normalizeLinkDistance,
  normalizeLinkStrength,
  normalizeEdgeOpacity,
  normalizeBaseSize,
  normalizeLabelAnchor,
  normalizeTagColorGradient,
} from "../adapters/configAdapter"

export async function renderGraph(graph: HTMLElement, fullSlug: FullSlug) {
  let slug = simplifySlug(fullSlug)

  if (fullSlug.startsWith("tags/") && !slug.endsWith("/")) {
    slug = (slug + "/") as SimpleSlug
  }

  const visited = getVisited()
  removeAllChildren(graph)

  // Load TagIndex and preload icons
  const tagIndex = await fetchTagIndex()
  await IconService.preloadIcons(getAllIconsFromTagIndex(tagIndex))

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
  } = parseGraphConfig(graph)

  // Normalize configuration
  const linkDistanceConfig = normalizeLinkDistance(linkDistance)
  const linkStrengthConfig = normalizeLinkStrength(linkStrength)
  const edgeOpacityConfig = normalizeEdgeOpacity(edgeOpacity)
  const baseSizeConfig = normalizeBaseSize(baseSize)
  const labelAnchorConfig = normalizeLabelAnchor(labelAnchor)

  // Fetch and process data
  const data = await fetchAndTransformData()
  const { links, tags } = buildLinksAndTags(data, tagIndex, showTags, removeTags)
  const validLinks = new Set(data.keys())
  const neighbourhood = calculateNeighborhood(slug, links, validLinks, tags, depth, showTags)
  const nodes = constructGraphNodes(neighbourhood, data)
  const graphData = constructGraphData(nodes, links, neighbourhood)

  const tagFileCountMap = buildGraphCountMap(tags, tagIndex)
  const tagColorMap = buildGraphColorMap(tags, tagIndex)

  // Setup dimensions and simulation
  const width = graph.offsetWidth
  const height = Math.max(graph.offsetHeight, 250)
  const nodeRadius = createNodeRadiusFunction(graphData, baseSizeConfig, tagFileCountMap)
  const simulation = setupSimulation(
    graphData,
    nodeRadius,
    { repelForce, centerForce },
    linkDistanceConfig,
    linkStrengthConfig,
    enableRadial ?? false,
    width,
    height,
  )

  // Setup rendering infrastructure
  const computedStyleMap = getComputedStyleMap()
  const color = createColorFunction(slug, visited, computedStyleMap, tagColorMap)
  const tweenManager = new TweenManager()

  const hoverState: HoverState = {
    hoveredNodeId: null,
    hoveredNeighbours: new Set(),
    dragStartTime: 0,
    dragging: false,
  }
  const linkRenderData: LinkRenderData[] = []
  const nodeRenderData: NodeRenderData[] = []

  const renderAllPixi = () => {
    renderPixiFromD3(
      tweenManager,
      linkRenderData,
      nodeRenderData,
      hoverState.hoveredNodeId,
      computedStyleMap,
      scale,
      focusOnHover ?? false,
    )
  }

  tweenManager.clear()

  // Create PixiJS app and containers
  const app = await createPixiApp(width, height)
  graph.appendChild(app.canvas)

  const stage = app.stage
  stage.interactive = false

  const { labelsContainer, nodesContainer, linkContainer } = setupPixiContainers(stage)

  // Create all nodes
  for (const n of graphData.nodes) {
    const result = await createNode(
      {
        node: n,
        nodeRadius,
        color,
        computedStyleMap,
        scale,
        opacityScale,
        fontSize,
        slug,
        labelAnchorConfig,
        tagIndex,
      },
      nodesContainer,
      labelsContainer,
      hoverState,
      linkRenderData,
      nodeRenderData,
      renderAllPixi,
    )
    nodeRenderData.push(result.nodeRenderData)
  }

  // Create all links
  for (const l of graphData.links) {
    const linkRenderDatum = createLink(l, linkContainer, computedStyleMap)
    linkRenderData.push(linkRenderDatum)
  }

  // Setup interactions
  if (enableDrag) {
    setupDragBehavior(app.canvas, graphData, hoverState, simulation)
  } else {
    setupClickBehavior(nodeRenderData)
  }

  if (enableZoom) {
    setupZoomBehavior(
      app.canvas,
      stage,
      width,
      height,
      opacityScale,
      labelsContainer,
      nodeRenderData,
      slug,
    )
  }

  // Start animation loop
  return startAnimationLoop(
    nodeRenderData,
    linkRenderData,
    tweenManager,
    app,
    stage,
    width,
    height,
    linkDistanceConfig,
    edgeOpacityConfig,
  )
}
