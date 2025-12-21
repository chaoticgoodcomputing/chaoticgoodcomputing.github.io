import type { SimpleSlug } from "../../../../util/path"

const VISITED_STORAGE_KEY = "graph-visited"

export function getVisited(): Set<SimpleSlug> {
  return new Set(JSON.parse(localStorage.getItem(VISITED_STORAGE_KEY) ?? "[]"))
}

export function addToVisited(slug: SimpleSlug) {
  const visited = getVisited()
  visited.add(slug)
  localStorage.setItem(VISITED_STORAGE_KEY, JSON.stringify([...visited]))
}
