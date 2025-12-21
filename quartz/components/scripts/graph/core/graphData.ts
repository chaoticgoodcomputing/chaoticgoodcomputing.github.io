import type { ContentDetails } from "../../../../plugins/emitters/contentIndex"
import { FullSlug, SimpleSlug, simplifySlug } from "../../../../util/path"
import type { NodeData, SimpleLinkData, LinkData } from "./types"

export function calculateEdgeOpacity(
  actualDistance: number,
  targetDistance: number,
  minOpacity: number,
  maxOpacity: number,
): number {
  const minDist = targetDistance * 0.5
  const maxDist = targetDistance * 2.0
  const clampedDist = Math.max(minDist, Math.min(maxDist, actualDistance))
  const t = (clampedDist - minDist) / (maxDist - minDist)
  return maxOpacity - t * (maxOpacity - minOpacity)
}

function tagToSlug(tag: string): SimpleSlug {
  const slug = simplifySlug(("tags/" + tag) as FullSlug)
  return slug.endsWith("/") ? slug : ((slug + "/") as SimpleSlug)
}

function splitHierarchicalTag(tag: SimpleSlug): { parent: SimpleSlug; leaf: SimpleSlug } | null {
  const normalizedTag = tag.endsWith("/") ? tag.slice(0, -1) : tag
  const tagPath = normalizedTag.replace(/^tags\//, "")
  const parts = tagPath.split("/")
  if (parts.length < 2) return null

  const parentPath = parts.slice(0, -1).join("/")
  return {
    parent: `tags/${parentPath}/` as SimpleSlug,
    leaf: tag,
  }
}

export function buildLinksAndTags(
  data: Map<SimpleSlug, ContentDetails>,
  showTags: boolean,
  removeTags: string[],
): { links: SimpleLinkData[]; tags: SimpleSlug[] } {
  const links: SimpleLinkData[] = []
  const tags: SimpleSlug[] = []
  const validLinks = new Set(data.keys())
  const parentChildPairs = new Set<string>()

  for (const [source, details] of data.entries()) {
    const outgoing = details.links ?? []

    for (const dest of outgoing) {
      if (validLinks.has(dest)) {
        links.push({ source, target: dest, type: "post-post" })
      }
    }

    if (!showTags) continue

    const localTags = (details.tags ?? [])
      .filter((tag) => !removeTags.includes(tag))
      .map(tagToSlug)

    for (const tag of localTags) {
      if (!tags.includes(tag)) {
        tags.push(tag)
      }

      let currentTag = tag
      while (true) {
        const splitTag = splitHierarchicalTag(currentTag)
        if (!splitTag) break

        if (!tags.includes(splitTag.parent)) {
          tags.push(splitTag.parent)
        }

        const pairKey = `${splitTag.parent}→${splitTag.leaf}`
        if (!parentChildPairs.has(pairKey)) {
          links.push({ source: splitTag.parent, target: splitTag.leaf, type: "tag-tag" })
          parentChildPairs.add(pairKey)
        }

        currentTag = splitTag.parent
      }

      links.push({ source, target: tag, type: "tag-post" })
    }
  }

  return { links, tags }
}

export function calculateNeighborhood(
  slug: SimpleSlug,
  links: SimpleLinkData[],
  validLinks: Set<SimpleSlug>,
  tags: SimpleSlug[],
  depthLimit: number,
  showTags: boolean,
): Set<SimpleSlug> {
  const neighbourhood = new Set<SimpleSlug>()
  const wl: (SimpleSlug | "__SENTINEL")[] = [slug, "__SENTINEL"]
  let depth = depthLimit

  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      const cur = wl.shift()!
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbourhood.add(cur)
        const outgoing = links.filter((l) => l.source === cur)
        const incoming = links.filter((l) => l.target === cur)
        wl.push(...outgoing.map((l) => l.target), ...incoming.map((l) => l.source))
      }
    }
  } else {
    validLinks.forEach((id) => neighbourhood.add(id))
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag))
  }

  return neighbourhood
}

export function constructGraphNodes(
  neighbourhood: Set<SimpleSlug>,
  data: Map<SimpleSlug, ContentDetails>,
): NodeData[] {
  return [...neighbourhood].map((url) => {
    if (url.startsWith("tags/")) {
      const normalizedUrl = url.endsWith("/") ? url.slice(0, -1) : url
      const tagPath = normalizedUrl.substring(5)
      const parts = tagPath.split("/")
      const displayName = parts[parts.length - 1]
      return {
        id: url,
        text: "#" + displayName,
        tags: data.get(url)?.tags ?? [],
      }
    }

    return {
      id: url,
      text: data.get(url)?.title ?? url,
      tags: data.get(url)?.tags ?? [],
    }
  })
}

export function constructGraphData(
  nodes: NodeData[],
  links: SimpleLinkData[],
  neighbourhood: Set<SimpleSlug>,
): { nodes: NodeData[]; links: LinkData[] } {
  return {
    nodes,
    links: links
      .filter((l) => neighbourhood.has(l.source) && neighbourhood.has(l.target))
      .map((l) => ({
        source: nodes.find((n) => n.id === l.source)!,
        target: nodes.find((n) => n.id === l.target)!,
        type: l.type,
      })),
  }
}
