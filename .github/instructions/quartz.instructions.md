---
applyTo: "**/*"
---

# Quartz Architecture Instructions

Quartz is a static site generator for Obsidian vaults using Preact JSX for templating (not React). Components are stateless—no hooks (`useState`, `useEffect`) or event handlers (`onClick`).

## Configuration

- `quartz.config.ts`: Global settings + plugin pipeline (transformers → filters → emitters)
- `quartz.layout.ts`: Page layouts via `SharedLayout` and `PageLayout` types

## Page Layout Structure

Layouts compose `QuartzComponent` arrays into page zones. See `quartz/cfg.ts` for types:

```
┌─────────────────────────────────────────────────────────┐
│                        head                             │  (metadata, not visible)
├─────────────────────────────────────────────────────────┤
│                       header[]                          │  (horizontal bar, optional)
├──────────┬──────────────────────────────┬───────────────┤
│          │        beforeBody[]          │               │
│  left[]  ├──────────────────────────────┤    right[]    │
│          │          pageBody            │               │
│          ├──────────────────────────────┤               │
│          │        afterBody[]           │               │
├──────────┴──────────────────────────────┴───────────────┤
│                        footer                           │
└─────────────────────────────────────────────────────────┘
```

- `SharedLayout`: `head`, `header`, `footer`, `afterBody` — shared across all page types
- `PageLayout`: `beforeBody`, `left`, `right` — varies by page type (content vs list)

## Development

```bash
nx build:docs # Dev server with hot reload at localhost:8080
nx quartz build  # Production build to public/
```

Hot reload watches two scopes:
1. **Source changes** (`.ts`, `.tsx`, `.scss`): Full rebuild via esbuild
2. **Content changes** (`.md` files): Incremental rebuild, ~250ms debounce

## Creating Components

Components live in `quartz/components/` and must be re-exported in `quartz/components/index.ts`.

```tsx
// Pattern: QuartzComponentConstructor factory
export default ((userOpts?: Options) => {
  const opts = { ...defaultOptions, ...userOpts }
  
  const MyComponent: QuartzComponent = (props: QuartzComponentProps) => {
    const { cfg, fileData, allFiles, displayClass } = props
    return <div class={classNames(displayClass, "my-component")}>...</div>
  }

  MyComponent.css = styles           // SCSS import or inline CSS string
  MyComponent.beforeDOMLoaded = "..."  // Pre-DOM script (string)
  MyComponent.afterDOMLoaded = script  // Post-DOM script (import from .inline.ts)
  
  return MyComponent
}) satisfies QuartzComponentConstructor
```

Key props: `fileData` (current page metadata), `cfg` (global config), `allFiles` (all pages), `tree` (HAST).

## Client Scripts

Scripts in `quartz/components/scripts/*.inline.ts` are bundled for browser. Use `document.addEventListener("nav", ...)` for SPA-compatible initialization—fires on initial load and client navigation.

## Analyzing Plugins

Plugins live in `quartz/plugins/{transformers,filters,emitters}/`. When investigating a plugin:

1. **Check the type** — determines when it runs in the pipeline:
   - `transformers`: Process markdown/HTML (remark/rehype plugins)
   - `filters`: Decide what content to publish
   - `emitters`: Generate output files

2. **Read the `Options` interface** — shows configurable behavior

3. **For transformers**, check which hooks are used:
   - `textTransform`: Raw text manipulation before parsing
   - `markdownPlugins`: remark plugins (mdast manipulation)
   - `htmlPlugins`: rehype plugins (hast manipulation)
   - `externalResources`: CDN scripts/styles needed client-side

4. **Obsidian-critical plugins** (in `quartz.config.ts`):
   - `FrontMatter`: YAML metadata parsing
   - `ObsidianFlavoredMarkdown`: Wikilinks, callouts, embeds
   - `CrawlLinks`: Link resolution (`markdownLinkResolution: "shortest"`)

## Path Types (quartz/util/path.ts)

Quartz uses branded string types—don't pass raw strings:
- `FilePath`: Absolute file path with extension
- `FullSlug`: Normalized slug (no leading `/`, no trailing `/`)
- `SimpleSlug`: Display-friendly slug (no `/index` suffix)

## Styling

- Global styles: `quartz/styles/custom.scss`
- Component styles: `quartz/components/styles/*.scss` (imported via component's `.css` property)
- Theme variables: `quartz/styles/variables.scss` (breakpoints, colors)

CSS is global—use specific class selectors to scope styles.

## i18n

Use `i18n(cfg.locale).components.{component}.{key}` for localized strings. Add new keys to `quartz/i18n/locales/definition.ts` and all locale files.
