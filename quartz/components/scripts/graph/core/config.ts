import type { D3Config } from "../../../Graph"

export function parseGraphConfig(graph: HTMLElement): D3Config {
  return JSON.parse(graph.dataset["cfg"]!) as D3Config
}
