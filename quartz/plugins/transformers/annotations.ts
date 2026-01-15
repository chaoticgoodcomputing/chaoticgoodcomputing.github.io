import { QuartzTransformerPlugin } from "../types"
import { Root } from "hast"
import { visit } from "unist-util-visit"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { toHtml } from "hast-util-to-html"

/**
 * Processes markdown text into HTML
 */
async function processMarkdown(text: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
  
  const tree = processor.parse(text)
  const hast = await processor.run(tree)
  return toHtml(hast as Root)
}

export interface AnnotationData {
  id?: string
  created: string
  updated: string
  document: {
    title: string
  }
  uri: string
  target: Array<{
    source: string
    selector: Array<
      | { type: "TextPositionSelector"; start: number; end: number }
      | { type: "TextQuoteSelector"; exact: string; prefix: string; suffix: string }
    >
  }>
  text?: string
  tags?: string[]
}

/**
 * Extracts Obsidian Annotator annotation blocks from markdown content
 * and stores them in fileData for use by the AnnotationViewer component.
 * 
 * This runs during the parse phase, before markdown is converted to HTML,
 * allowing us to access the raw blockquote syntax.
 */
export const Annotations: QuartzTransformerPlugin = () => {
  return {
    name: "Annotations",
    textTransform(_ctx, src) {
      // Extract annotations from raw markdown before it's parsed
      const annotations: AnnotationData[] = []
      
      // Match annotation blocks: >%%\n>```annotation-json\n>{json}\n>```\n>%%\n...\n^id
      const annotationRegex = />%%\s*\n>```annotation-json\s*\n>([\s\S]*?)\n>```\s*\n>%%[\s\S]*?\n\^([a-z0-9]+)/gm
      
      let match: RegExpExecArray | null
      while ((match = annotationRegex.exec(src)) !== null) {
        try {
          // Extract JSON string (remove > prefix from each line)
          const jsonLines = match[1].split('\n')
          const jsonStr = jsonLines.map(line => line.replace(/^>/, '')).join('\n')
          const annotationId = match[2]
          
          const annotation = JSON.parse(jsonStr) as AnnotationData
          annotation.id = annotationId
          annotations.push(annotation)
        } catch (e) {
          console.error(`[Annotations] Failed to parse annotation: ${e}`)
        }
      }
      
      // Remove annotation blocks from source to prevent MDX parsing errors
      // Use a fresh regex instance for replacement since we already consumed the matches above
      const annotationRemovalRegex = />%%\s*\n>```annotation-json\s*\n>([\s\S]*?)\n>```\s*\n>%%[\s\S]*?\n\^([a-z0-9]+)/gm
      src = src.replace(annotationRemovalRegex, '')
      
      // Store annotations in a way that will be accessible in fileData
      // We'll inject this as a special code block that won't be rendered
      // Using a code fence is MDX-compatible unlike HTML comments
      if (annotations.length > 0) {
        const annotationsJson = JSON.stringify(annotations)
        const encoded = Buffer.from(annotationsJson).toString('base64')
        // Use a hidden code block that will be in the tree but not rendered
        src += `\n\n\`\`\`quartz-annotations\n${encoded}\n\`\`\`\n`
      }
      
      return src
    },
    markdownPlugins() {
      return [
        () => {
          return async (tree: Root, file) => {
            // Extract annotation metadata from the hidden code block we injected
            let annotationsToProcess: any[] = []
            let codeNode: any = null
            
            visit(tree, "code", (node: any) => {
              // Look for our special quartz-annotations code block
              if (node.lang === "quartz-annotations" && node.value) {
                try {
                  const annotationsJson = Buffer.from(node.value.trim(), 'base64').toString('utf-8')
                  const annotations = JSON.parse(annotationsJson)
                  annotationsToProcess = annotations
                  codeNode = node
                } catch (e) {
                  console.error(`[Annotations] Failed to decode annotation metadata: ${e}`)
                }
              }
            })
            
            // Process markdown in annotation text fields (outside of visit callback)
            if (annotationsToProcess.length > 0) {
              for (const annotation of annotationsToProcess) {
                if (annotation.text) {
                  annotation.text = await processMarkdown(annotation.text)
                }
              }
              
              // Store in file data for component access
              file.data.annotations = annotationsToProcess
              
              // Remove the code block from output
              if (codeNode) {
                codeNode.type = 'html'
                codeNode.value = ''
                delete codeNode.lang
              }
            }
          }
        }
      ]
    },
  }
}
