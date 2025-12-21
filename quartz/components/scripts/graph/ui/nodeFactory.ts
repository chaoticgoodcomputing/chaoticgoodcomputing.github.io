import { Circle, Container, Graphics, Sprite, Text } from "pixi.js"
import { SimpleSlug } from "../../../../util/path"
import { IconService } from "../../../../util/iconService"
import { getIconForTag, getIconForTags } from "../../../../util/iconHelpers"
import { NodeData } from "../core/types"
import { LinkRenderData, NodeRenderData } from "../core/renderTypes"
import { HoverState, updateHoverInfo } from "../core/hoverState"
import { createIconTexture } from "./pixiSetup"

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
}

export type NodeCreationResult = {
  nodeRenderData: NodeRenderData
  gfx: Graphics
  label: Text
}

export async function createNode(
  params: NodeCreationParams,
  nodesContainer: Container<Graphics>,
  labelsContainer: Container<Text>,
  hoverState: HoverState,
  linkRenderData: LinkRenderData[],
  nodeRenderData: NodeRenderData[],
  renderAllPixi: () => void,
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
  } = params

  const nodeId = n.id
  const isTagNode = nodeId.startsWith("tags/")
  const isCurrentPage = nodeId === slug

  const initialOpacity =
    isTagNode || isCurrentPage ? 1 : Math.max((scale * opacityScale - 1) / 3.75, 0)

  const radius = nodeRadius(n)
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
  const fillColor = isTagNode ? computedStyleMap["--gray"] : nodeColor
  const gfx = new Graphics({
    interactive: true,
    label: nodeId,
    eventMode: "static",
    hitArea: new Circle(0, 0, radius),
    cursor: "pointer",
  })
    .circle(0, 0, radius)
    .fill({ color: fillColor })
    .on("pointerover", (e) => {
      updateHoverInfo(hoverState, linkRenderData, nodeRenderData, e.target.label)
      oldLabelOpacity = label.alpha
      if (!hoverState.dragging) {
        renderAllPixi()
      }
    })
    .on("pointerleave", () => {
      updateHoverInfo(hoverState, linkRenderData, nodeRenderData, null)
      label.alpha = oldLabelOpacity
      if (!hoverState.dragging) {
        renderAllPixi()
      }
    })

  if (isTagNode) {
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

  // Handle icon asynchronously
  let iconId: string | null = null
  if (isTagNode) {
    let tag = nodeId.substring(5)
    if (tag.endsWith("/")) {
      tag = tag.substring(0, tag.length - 1)
    }
    iconId = getIconForTag(tag)
  } else {
    iconId = getIconForTags(n.tags)
  }

  if (iconId) {
    IconService.getIcon(iconId).then((iconData) => {
      if (!iconData) return
      createIconTexture(iconData.dataUri).then((texture) => {
        if (!texture) return
        const iconSprite = new Sprite({
          texture,
          anchor: { x: 0.5, y: 0.5 },
          eventMode: "none",
          interactive: false,
        })
        const iconSize = radius * 1.4
        iconSprite.width = iconSize
        iconSprite.height = iconSize
        iconSprite.tint = 0xffffff
        gfx.addChild(iconSprite)
        nodeRenderDatum.iconSprite = iconSprite
      })
    })
  }

  return { nodeRenderData: nodeRenderDatum, gfx, label }
}

export function createLink(
  linkData: any,
  linkContainer: Container<Graphics>,
  computedStyleMap: Record<string, string>,
): LinkRenderData {
  const gfx = new Graphics({ interactive: false, eventMode: "none" })
  linkContainer.addChild(gfx)

  const linkRenderDatum: LinkRenderData = {
    simulationData: linkData,
    gfx,
    color: computedStyleMap["--lightgray"],
    alpha: 1,
    active: false,
  }

  return linkRenderDatum
}
