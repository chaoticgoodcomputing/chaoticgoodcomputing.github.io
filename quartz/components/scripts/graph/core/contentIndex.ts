import type { ContentDetails } from "../../../../plugins/emitters/contentIndex"
import { FullSlug, SimpleSlug, simplifySlug } from "../../../../util/path"

export async function fetchAndTransformData(): Promise<Map<SimpleSlug, ContentDetails>> {
  const index = await fetchData
  return new Map(
    Object.entries<ContentDetails>(index).map(([k, v]) => [simplifySlug(k as FullSlug), v]),
  )
}
