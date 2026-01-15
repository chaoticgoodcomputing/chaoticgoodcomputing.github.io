import { WidgetRegistry } from "./types"
import { pdfViewer } from "./pdf-viewer"
import { counter } from "./counter"
import { initCheck } from "./init-check"
import { globalInitialization } from "./global-initialization"

/**
 * Central widget registry for MDX.
 * 
 * To add a new widget:
 * 1. Create the widget in quartz/widgets/{name}/
 * 2. Import and register it here
 * 3. Use it in MDX files: import { Widget } from '@widgets/{name}'
 * 
 * Example:
 * ```typescript
 * import { pdfViewer } from "./pdf-viewer"
 * 
 * export const widgets: WidgetRegistry = {
 *   "@widgets/pdf-viewer": pdfViewer,
 * }
 * ```
 */
export const widgets: WidgetRegistry = {
  "@widgets/pdf-viewer": pdfViewer,
  "@widgets/counter": counter,
  "@widgets/init-check": initCheck,
  "@widgets/global-initialization": globalInitialization,
}

/**
 * Get a widget definition by import path.
 */
export function getWidget(importPath: string) {
  return widgets[importPath]
}

/**
 * Get all registered widget import paths.
 */
export function getAllWidgetPaths(): string[] {
  return Object.keys(widgets)
}
