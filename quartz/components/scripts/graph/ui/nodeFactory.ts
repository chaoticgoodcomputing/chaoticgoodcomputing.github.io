import { SimpleSlug } from "../../../../util/path"
import { IconService } from "../../../../util/iconService"
import type { TagIndex } from "../../../../util/tags"
import { getTagIcon, getIconForTagsFromIndex } from "../core/tagIndex"
import { NodeData } from "../core/types"
import { LinkRenderData, NodeRenderData, LabelData } from "../core/renderTypes"
import { HoverState, updateHoverInfo } from "../core/hoverState"
import { loadIconImage } from "./canvasSetup"

export type NodeCreationParams = {
  node: NodeData
  nodeRadius: (n: NodeData) => number
  color: (d: NodeData) => string
  computedStyleMap: Record<string, string>
  scale: number
  opacityScale: number
  fontSize: number
  slug: SimpleSlug
  labelAnchorConfig: { baseY: number; scaleFactor: number }
  tagIndex: TagIndex
}

export type NodeCreationResult = {
  nodeRenderData: NodeRenderData
}

export async function createNode(
  params: NodeCreationParams,
  hoverState: HoverState,
  linkRenderData: LinkRenderData[],
  nodeRenderData: NodeRenderData[],
  renderAll: () => void,
): Promise<NodeCreationResult> {
  const {
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
  } = params

  const nodeId = n.id
  const isTagNode = nodeId.startsWith("tags/")
  const isCurrentPage = nodeId === slug

  const initialOpacity =
    isTagNode || isCurrentPage ? 1 : Math.max((scale * opacityScale - 1) / 3.75, 0)

  const radius = nodeRadius(n)
  const yAnchor = labelAnchorConfig.baseY + (radius - 2) * labelAnchorConfig.scaleFactor

  const label: LabelData = {
    text: n.text,
    alpha: initialOpacity,
    scale: 1 / scale,
    fontSize: fontSize * 15,
    color: computedStyleMap["--dark"],
    fontFamily: computedStyleMap["--bodyFont"],
    anchor: { x: 0.5, y: yAnchor },
    x: 0,
    y: 0,
    initialAlpha: initialOpacity,
  }

  let oldLabelOpacity = initialOpacity
  const nodeColor = color(n)
  const fillColor = isTagNode ? computedStyleMap["--gray"] : nodeColor

  const nodeRenderDatum: NodeRenderData = {
    simulationData: n,
    label,
    color: nodeColor,
    alpha: 1,
    active: false,
    radius,
    fillColor,
    strokeColor: isTagNode ? nodeColor : undefined,
    strokeWidth: isTagNode ? 2 : undefined,
  }

  // Handle icon asynchronously
  let iconId: string | null = null
  if (isTagNode) {
    let tag = nodeId.substring(5)
    if (tag.endsWith("/")) {
      tag = tag.substring(0, tag.length - 1)
    }
    iconId = getTagIcon(tag, tagIndex)
  } else {
    iconId = getIconForTagsFromIndex(n.tags, tagIndex)
  }

  if (iconId) {
    const currentIconId = iconId
    IconService.getIcon(currentIconId).then((iconData) => {
      if (!iconData) return
      loadIconImage(iconData.dataUri, currentIconId).then((img) => {
        if (!img) return
        const iconSize = radius * 1.4
        nodeRenderDatum.iconImage = img
        nodeRenderDatum.iconSize = iconSize
      })
    })
  }

  return { nodeRenderData: nodeRenderDatum }
}

export function createLink(
  linkData: any,
  computedStyleMap: Record<string, string>,
): LinkRenderData {
  const linkRenderDatum: LinkRenderData = {
    simulationData: linkData,
    color: computedStyleMap["--lightgray"],
    alpha: 1,
    active: false,
  }

  return linkRenderDatum
}
