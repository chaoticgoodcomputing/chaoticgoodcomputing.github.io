import { JSX } from "preact/jsx-runtime"

/**
 * Props that widget placeholder components receive at build time.
 * These are the props passed in the MDX: <WidgetName prop1="value1" prop2="value2" />
 */
export type WidgetProps = Record<string, unknown>

/**
 * A widget component that renders a static HTML placeholder at build time.
 * The placeholder should include data attributes for the client script to hydrate.
 */
export type WidgetComponent = (props: WidgetProps) => JSX.Element

/**
 * Client-side script that hydrates the widget placeholders.
 * This script will be loaded on pages that use the widget.
 */
export type WidgetScript = string

/**
 * Optional CSS for the widget.
 */
export type WidgetCSS = string

/**
 * Complete widget definition that can be registered in the widget registry.
 */
export interface WidgetDefinition {
  /**
   * The component that renders static HTML placeholder at build time.
   * This should render a container with data attributes that the script uses.
   */
  Component: WidgetComponent

  /**
   * Client-side script content (loaded from .inline.ts file).
   * This script finds widget containers on the page and initializes them.
   */
  script: WidgetScript

  /**
   * Optional CSS styles for the widget.
   */
  css?: WidgetCSS

  /**
   * CSS selector the script uses to find widget containers.
   * Example: ".widget-pdf-viewer"
   */
  selector: string

  /**
   * Script filename (without extension) for emitting to /static/widgets/
   * Example: "pdf-viewer" → /static/widgets/pdf-viewer.js
   */
  scriptName: string
}

/**
 * Registry mapping import paths to widget definitions.
 * Example: { "@widgets/pdf-viewer": pdfViewerDefinition }
 */
export interface WidgetRegistry {
  [importPath: string]: WidgetDefinition
}
