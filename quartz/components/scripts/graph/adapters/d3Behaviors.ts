import { Simulation, drag, select, zoom, zoomIdentity } from "d3"
import { Container, Text } from "pixi.js"
import { SimpleSlug } from "../../../../util/path"
import { LinkData, NodeData } from "../core/types"
import { NodeRenderData } from "../core/renderTypes"
import { HoverState } from "../core/hoverState"

export function setupDragBehavior(
  canvas: HTMLCanvasElement,
  graphData: { nodes: NodeData[]; links: LinkData[] },
  hoverState: HoverState,
  simulation: Simulation<NodeData, LinkData>,
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

        if (Date.now() - hoverState.dragStartTime < 500) {
          const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
          const targ = "/" + node.id
          window.spaNavigate(new URL(targ, window.location.toString()))
        }
      }),
  )

  return { currentTransform }
}

export function setupClickBehavior(nodeRenderData: NodeRenderData[]) {
  for (const node of nodeRenderData) {
    node.gfx.on("click", () => {
      const targ = "/" + node.simulationData.id
      window.spaNavigate(new URL(targ, window.location.toString()))
    })
  }
}

export function setupZoomBehavior(
  canvas: HTMLCanvasElement,
  stage: Container,
  width: number,
  height: number,
  opacityScale: number,
  labelsContainer: Container<Text>,
  nodeRenderData: NodeRenderData[],
  currentPageSlug: SimpleSlug,
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

        const scale = transform.k * opacityScale
        const scaleOpacity = Math.max((scale - 1) / 3.75, 0)
        const activeNodes = nodeRenderData.filter((n) => n.active).flatMap((n) => n.label)

        for (const label of labelsContainer.children) {
          if (!activeNodes.includes(label)) {
            const nodeData = nodeRenderData.find((n) => n.label === label)
            const isTagNode = nodeData?.simulationData.id.startsWith("tags/")
            const isCurrentPage = nodeData?.simulationData.id === currentPageSlug
            label.alpha = isTagNode || isCurrentPage ? 1 : scaleOpacity
          }
        }
      }),
  )

  return { currentTransform }
}
