import { fetchCanonical } from "../../util"

export async function fetchPopoverTarget(targetUrl: URL): Promise<Response | null> {
  try {
    return await fetchCanonical(targetUrl)
  } catch (err) {
    console.error(err)
    return null
  }
}
