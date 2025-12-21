import { Graphics, Text, Sprite } from "pixi.js"
import { LinkData, NodeData } from "./types"

export type GraphicsInfo = {
  color: string
  gfx: Graphics
  alpha: number
  active: boolean
}

export type LinkRenderData = GraphicsInfo & {
  simulationData: LinkData
}

export type NodeRenderData = GraphicsInfo & {
  simulationData: NodeData
  label: Text
  iconSprite?: Sprite
}

export type TweenNode = {
  update: (time: number) => void
  stop: () => void
}
