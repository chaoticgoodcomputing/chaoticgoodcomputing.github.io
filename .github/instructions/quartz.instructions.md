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

## Debugging Workflow

### Development Server + curl Testing

The `site:serve` task runs a development server with hot reload at `localhost:8080`. Combine with `curl` for efficient debugging:

**Data Layer Verification:**
```bash
# Check content index structure (token-efficient)
curl -s http://localhost:8080/static/contentIndex.json | jq 'keys | length'
curl -s http://localhost:8080/static/contentIndex.json | jq 'to_entries | .[0:2]'  # Sample first 2 entries

# Verify tag/metadata availability
curl -s http://localhost:8080/static/contentIndex.json | jq 'to_entries | map(.value.tags) | flatten | unique | sort'

# Find specific entries (most efficient - targets single item)
curl -s http://localhost:8080/static/contentIndex.json | jq '.["path/to/file"]'

# Count and sample, don't dump entire datasets
curl -s http://localhost:8080/static/contentIndex.json | jq '[to_entries[] | select(.value.tags | length > 0)] | length'
curl -s http://localhost:8080/static/contentIndex.json | jq 'to_entries[] | select(.value.tags | length > 0) | limit(2; .)'
```

**Token-Efficient Exploration:**
- Use `jq` filters to sample (`.[0:2]`, `limit(n; .)`) instead of dumping full JSON
- Count first (`length`), then sample selectively
- Use direct key access (`.["key"]`) instead of filtering all entries when possible
- For HTML inspection, use `grep -A N` to limit context lines or `head -n` to cap output

**Build Output Verification:**
```bash
# Confirm components rendered
curl -s http://localhost:8080 | grep -o 'class="component-name"'

# Check data attributes
curl -s http://localhost:8080 | grep 'data-opts'

# Verify inline scripts
curl -s http://localhost:8080 | grep -A 10 '<script>'
```

### What curl Can and Cannot Tell You

**Use curl for (server-side rendered data):**
- ✅ Static data structures (contentIndex.json, sitemap.xml)
- ✅ Initial HTML structure and component rendering
- ✅ Build-time configuration (data attributes)
- ✅ Metadata (titles, descriptions, meta tags)
- ✅ Scriptable testing and CI/CD integration
- ✅ Fast iteration without browser

**Use Simple Browser for (client-side behavior):**
- ✅ JavaScript execution and DOM manipulation
- ✅ Visual rendering and CSS application
- ✅ Interactive behavior (clicks, expand/collapse)
- ✅ Runtime state (localStorage, sessionStorage)
- ✅ Browser DevTools (console errors, network tab)
- ✅ Verifying `fetchData` promise resolution

**Key Insight:** `curl` shows what the build emitted, Simple Browser shows what actually works at runtime.

### Common Debugging Pattern

1. **Verify data layer** with curl (contentIndex structure, component rendering)
2. **If data looks good but UI broken** → use Simple Browser + DevTools
3. **For CSS/visual issues** → must use Simple Browser
4. **For build/config issues** → curl is sufficient

### Example: Client-Side Script Issues

A component may render correctly in HTML (visible via curl) but fail at runtime if:
- Inline script references wrong data structure (e.g., `content.frontmatter.tags` vs `content.tags`)
- `fetchData` promise fails or returns unexpected format
- Event handlers don't attach properly
- Browser console has JavaScript errors

Always check both: `curl` for build output, Simple Browser for runtime behavior.
