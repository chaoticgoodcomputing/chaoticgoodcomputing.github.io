import { Root as HtmlRoot } from "hast"
import { Root as MdRoot } from "mdast"
import { Data, VFile } from "vfile"
import { PageResources } from "../util/resources"

export type QuartzPluginData = Data
export type MarkdownContent = [MdRoot, VFile]
export type ProcessedContent = [HtmlRoot, VFile]

export function defaultProcessedContent(vfileData: Partial<QuartzPluginData>): ProcessedContent {
  const root: HtmlRoot = { type: "root", children: [] }
  const vfile = new VFile("")
  vfile.data = vfileData
  return [root, vfile]
}

declare module "vfile" {
  interface DataMap {
    /**
     * Per-page resources that transformers can attach to individual files.
     * These are merged into the page's externalResources during rendering.
     * 
     * Example usage in a transformer:
     * ```typescript
     * file.data.pageResources ??= {}
     * file.data.pageResources.js ??= []
     * file.data.pageResources.js.push({
     *   src: "/static/widgets/my-widget.js",
     *   loadTime: "afterDOMReady",
     *   contentType: "external",
     * })
     * ```
     */
    pageResources?: PageResources
  }
}
