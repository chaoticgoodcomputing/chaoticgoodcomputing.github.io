import type { WidgetRegistry } from "../../../quartz/widgets/types"
import { greeting } from "./greeting"
import { initialization } from "./initialization"

/**
 * Vault-specific widget registry.
 * 
 * These widgets are specific to your content and live in content/public/widgets/.
 * They follow the same pattern as global widgets but use @content/widgets/ imports.
 * 
 * To add a new vault widget:
 * 1. Create the widget in content/public/widgets/{name}/
 * 2. Import and register it here
 * 3. Use it in MDX files: import { Widget } from '@content/widgets/{name}'
 */
export const contentWidgets: WidgetRegistry = {
  "@content/widgets/greeting": greeting,
  "@content/widgets/initialization": initialization,
}

/**
 * Get a vault widget definition by import path.
 */
export function getContentWidget(importPath: string) {
  return contentWidgets[importPath]
}

/**
 * Get all registered vault widget import paths.
 */
export function getAllContentWidgetPaths(): string[] {
  return Object.keys(contentWidgets)
}
