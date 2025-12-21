import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js"
import { Application, Container, Graphics, Text } from "pixi.js"
import { LinkRenderData, NodeRenderData } from "../core/renderTypes"
import { calculateEdgeOpacity } from "../core/graphData"
import { TweenManager } from "../core/tweenManager"

export function renderLinks(
  tweenManager: TweenManager,
  linkRenderData: LinkRenderData[],
  hoveredNodeId: string | null,
  styleMap: Record<string, string>,
) {
  tweenManager.get("link")?.stop()
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
  tweenManager.set("link", {
    update: tweenGroup.update.bind(tweenGroup),
    stop() {
      tweenGroup.getAll().forEach((tw) => tw.stop())
    },
  })
}

export function renderLabels(
  tweenManager: TweenManager,
  nodeRenderData: NodeRenderData[],
  hoveredNodeId: string | null,
  scale: number,
) {
  tweenManager.get("label")?.stop()
  const tweenGroup = new TweenGroup()

  const defaultScale = 1 / scale
  const activeScale = defaultScale * 1.1
  for (const n of nodeRenderData) {
    const nodeId = n.simulationData.id
    if (hoveredNodeId === nodeId) {
      tweenGroup.add(
        new Tweened<Text>(n.label).to({ alpha: 1, scale: { x: activeScale, y: activeScale } }, 100),
      )
    } else {
      tweenGroup.add(
        new Tweened<Text>(n.label).to(
          { alpha: n.label.alpha, scale: { x: defaultScale, y: defaultScale } },
          100,
        ),
      )
    }
  }

  tweenGroup.getAll().forEach((tw) => tw.start())
  tweenManager.set("label", {
    update: tweenGroup.update.bind(tweenGroup),
    stop() {
      tweenGroup.getAll().forEach((tw) => tw.stop())
    },
  })
}

export function renderNodes(
  tweenManager: TweenManager,
  nodeRenderData: NodeRenderData[],
  hoveredNodeId: string | null,
  focusOnHover: boolean,
) {
  tweenManager.get("hover")?.stop()
  const tweenGroup = new TweenGroup()

  for (const n of nodeRenderData) {
    let alpha = 1
    if (hoveredNodeId !== null && focusOnHover) {
      alpha = n.active ? 1 : 0.2
    }
    tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha }, 200))
  }

  tweenGroup.getAll().forEach((tw) => tw.start())
  tweenManager.set("hover", {
    update: tweenGroup.update.bind(tweenGroup),
    stop() {
      tweenGroup.getAll().forEach((tw) => tw.stop())
    },
  })
}

export function renderPixiFromD3(
  tweenManager: TweenManager,
  linkRenderData: LinkRenderData[],
  nodeRenderData: NodeRenderData[],
  hoveredNodeId: string | null,
  styleMap: Record<string, string>,
  scale: number,
  focusOnHover: boolean,
) {
  renderLinks(tweenManager, linkRenderData, hoveredNodeId, styleMap)
  renderLabels(tweenManager, nodeRenderData, hoveredNodeId, scale)
  renderNodes(tweenManager, nodeRenderData, hoveredNodeId, focusOnHover)
}

export function startAnimationLoop(
  nodeRenderData: NodeRenderData[],
  linkRenderData: LinkRenderData[],
  tweenManager: TweenManager,
  app: Application,
  stage: Container,
  width: number,
  height: number,
  linkDistanceConfig: { tagTag: number; tagPost: number; postPost: number },
  edgeOpacityConfig: {
    tagTag: { min: number; max: number }
    tagPost: { min: number; max: number }
    postPost: { min: number; max: number }
  },
): () => void {
  let stopAnimation = false

  function animate(time: number) {
    if (stopAnimation) return

    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData
      if (!x || !y) continue
      n.gfx.position.set(x + width / 2, y + height / 2)
      n.label.position.set(x + width / 2, y + height / 2)
    }

    for (const l of linkRenderData) {
      const linkData = l.simulationData
      const sx = linkData.source.x! + width / 2
      const sy = linkData.source.y! + height / 2
      const tx = linkData.target.x! + width / 2
      const ty = linkData.target.y! + height / 2

      const dx = tx - sx
      const dy = ty - sy
      const distance = Math.sqrt(dx * dx + dy * dy)

      const targetDistance =
        linkData.type === "tag-tag"
          ? linkDistanceConfig.tagTag
          : linkData.type === "tag-post"
            ? linkDistanceConfig.tagPost
            : linkDistanceConfig.postPost

      const opacityConfig =
        linkData.type === "tag-tag"
          ? edgeOpacityConfig.tagTag
          : linkData.type === "tag-post"
            ? edgeOpacityConfig.tagPost
            : edgeOpacityConfig.postPost

      const baseOpacity = calculateEdgeOpacity(
        distance,
        targetDistance,
        opacityConfig.min,
        opacityConfig.max,
      )
      const finalAlpha = baseOpacity * l.alpha

      l.gfx.clear()
      l.gfx.moveTo(sx, sy)
      l.gfx.lineTo(tx, ty).stroke({ alpha: finalAlpha, width: 1, color: l.color })
    }

    tweenManager.updateAll(time)
    app.renderer.render(stage)
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)

  return () => {
    stopAnimation = true
    app.destroy()
  }
}
