import { QuartzEmitterPlugin } from "../types"
import { FullSlug, joinSegments } from "../../util/path"
import { write } from "./helpers"
import { widgets } from "../../widgets/registry"
import { contentWidgets } from "../../../content/public/widgets/registry"
import { transform } from "esbuild"

/**
 * Widget Scripts Emitter
 * 
 * Emits individual JavaScript files for each registered widget to /static/widgets/.
 * Each widget script is minified and output as a separate file for efficient loading.
 * 
 * Output: /static/widgets/{widget-name}.js for each registered widget
 * 
 * This allows per-page script injection - only pages that use a widget will load its script.
 */
export const WidgetScripts: QuartzEmitterPlugin = () => {
  return {
    name: "WidgetScripts",
    async *emit(ctx, _content, _resources) {
      // Combine both global and content widget registries
      const allWidgets = { ...widgets, ...contentWidgets }
      
      // Emit a script file for each registered widget
      for (const [, widget] of Object.entries(allWidgets)) {
        // Minify the widget script
        const minified = await transform(widget.script, {
          minify: true,
          target: "es2020",
        })

        // Output to /static/widgets/{scriptName}.js
        yield write({
          ctx,
          slug: joinSegments("static", "widgets", widget.scriptName) as FullSlug,
          ext: ".js",
          content: minified.code,
        })

        // If the widget has CSS, emit that too
        if (widget.css) {
          yield write({
            ctx,
            slug: joinSegments("static", "widgets", widget.scriptName) as FullSlug,
            ext: ".css",
            content: widget.css,
          })
        }
      }
    },
    async *partialEmit() {
      // For incremental builds, we still emit all widget scripts
      // since they're shared across pages
      // In the future, could optimize to only emit scripts for widgets
      // used by changed pages
    },
  }
}
