/**
 * Quartz Layout Configuration
 * 
 * This file serves as the central configuration for page layouts.
 * Individual page type layouts are defined in the quartz/layouts/ directory:
 * 
 * - shared.layout.ts: Components shared across all pages (head, header, footer)
 * - index.layout.ts: Homepage/landing page layout
 * - notes.layout.ts: Regular markdown content pages
 * - tags.layout.ts: Tag and folder listing pages
 * - annotations.layout.ts: PDF annotation pages (template)
 * 
 * To customize a specific page type, edit the corresponding layout file.
 * To add a new page type, create a new layout file and update the relevant emitter.
 */

// Re-export layouts for convenient access
export { sharedPageComponents } from "./quartz/layouts/shared.layout"
export { indexLayout } from "./quartz/layouts/index.layout"
export { notesLayout } from "./quartz/layouts/notes.layout"
export { tagsLayout } from "./quartz/layouts/tags.layout"
export { annotationsLayout } from "./quartz/layouts/annotations.layout"
export { notFoundLayout } from "./quartz/layouts/404.layout"

// Re-export graph options for customization
export { 
  defaultGraphOptions, 
  defaultLocalGraphOptions 
} from "./quartz/layouts/index.layout"

