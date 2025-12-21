import { SimpleSlug } from "../../../../util/path"
import { NodeData } from "../core/types"

function getComputedStyleMap(): Record<string, string> {
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

function createColorFunction(
  slug: SimpleSlug,
  visited: Set<SimpleSlug>,
  styleMap: Record<string, string>,
  tagColorMap: Map<SimpleSlug, string>,
) {
  return (d: NodeData): string => {
    const isCurrent = d.id === slug
    if (isCurrent) {
      return styleMap["--secondary"]
    }

    if (d.id.startsWith("tags/")) {
      return tagColorMap.get(d.id) ?? styleMap["--tertiary"]
    }

    if (visited.has(d.id)) {
      return styleMap["--tertiary"]
    }

    return styleMap["--gray"]
  }
}

export { getComputedStyleMap, createColorFunction }
