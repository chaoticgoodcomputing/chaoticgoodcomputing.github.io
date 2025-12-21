import type { ContentDetails } from "../../../../plugins/emitters/contentIndex"
import { FullSlug, SimpleSlug, simplifySlug } from "../../../../util/path"

function splitHierarchicalTag(tag: SimpleSlug): { parent: SimpleSlug; leaf: SimpleSlug } | null {
  const normalizedTag = tag.endsWith("/") ? tag.slice(0, -1) : tag
  const tagPath = normalizedTag.replace(/^tags\//, "")
  const parts = tagPath.split("/")

  if (parts.length < 2) {
    return null
  }

  const parentPath = parts.slice(0, -1).join("/")
  return {
    parent: `tags/${parentPath}/` as SimpleSlug,
    leaf: tag,
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0]
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16)
        return hex.length === 1 ? "0" + hex : hex
      })
      .join("")
}

function lerpGradient(colors: string[], t: number): string {
  if (colors.length === 0) return "#888888"
  if (colors.length === 1) return colors[0]

  t = Math.max(0, Math.min(1, t))

  const scaledT = t * (colors.length - 1)
  const index = Math.floor(scaledT)
  const localT = scaledT - index

  if (index >= colors.length - 1) {
    return colors[colors.length - 1]
  }

  const color1 = hexToRgb(colors[index])
  const color2 = hexToRgb(colors[index + 1])

  const r = color1[0] + (color2[0] - color1[0]) * localT
  const g = color1[1] + (color2[1] - color1[1]) * localT
  const b = color1[2] + (color2[2] - color1[2]) * localT

  return rgbToHex(r, g, b)
}

export function buildTagFileCountMap(
  data: Map<SimpleSlug, ContentDetails>,
  tags: SimpleSlug[],
): Map<SimpleSlug, number> {
  const fileCountMap = new Map<SimpleSlug, number>()

  for (const tag of tags) {
    let count = 0

    for (const details of data.values()) {
      const fileTags = (details.tags ?? []).map((tagName) => {
        const slug = simplifySlug(("tags/" + tagName) as FullSlug)
        return slug.endsWith("/") ? slug : ((slug + "/") as SimpleSlug)
      })

      if (fileTags.includes(tag)) {
        count++
      }
    }

    fileCountMap.set(tag, count)
  }

  const sortedTags = [...tags].sort((a, b) => {
    const depthA = (a.match(/\//g) || []).length
    const depthB = (b.match(/\//g) || []).length
    return depthB - depthA
  })

  for (const tag of sortedTags) {
    const splitTag = splitHierarchicalTag(tag)
    if (splitTag) {
      const childCount = fileCountMap.get(tag) || 0
      const parentCount = fileCountMap.get(splitTag.parent) || 0
      fileCountMap.set(splitTag.parent, parentCount + childCount)
    }
  }

  return fileCountMap
}

function getTopLevelTag(tag: SimpleSlug): SimpleSlug {
  const tagPath = tag.replace(/^tags\//, "")
  const parts = tagPath.split("/")
  return `tags/${parts[0]}` as SimpleSlug
}

export function buildTagColorMap(tags: SimpleSlug[], gradient: string[]): Map<SimpleSlug, string> {
  const colorMap = new Map<SimpleSlug, string>()

  const topLevelTags = [...new Set(tags.map(getTopLevelTag))].sort((a, b) => {
    const aPath = a.replace(/^tags\//, "")
    const bPath = b.replace(/^tags\//, "")
    return aPath.localeCompare(bPath, undefined, { numeric: true, sensitivity: "base" })
  })

  for (let i = 0; i < topLevelTags.length; i++) {
    const t = topLevelTags.length === 1 ? 0.5 : i / (topLevelTags.length - 1)
    const color = lerpGradient(gradient, t)
    colorMap.set(topLevelTags[i], color)
  }

  for (const tag of tags) {
    if (!colorMap.has(tag)) {
      const topLevel = getTopLevelTag(tag)
      const color = colorMap.get(topLevel)
      if (color) {
        colorMap.set(tag, color)
      }
    }
  }

  return colorMap
}
