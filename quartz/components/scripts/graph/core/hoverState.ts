import { LinkRenderData, NodeRenderData } from "./renderTypes"

export type HoverState = {
  hoveredNodeId: string | null
  hoveredNeighbours: Set<string>
  dragStartTime: number
  dragging: boolean
}

export function updateHoverInfo(
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
    return
  }

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
