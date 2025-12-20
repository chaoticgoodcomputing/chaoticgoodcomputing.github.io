# Icon System Documentation

The icon system provides a centralized, reusable way to associate icons with tags throughout Quartz components.

## Architecture

The icon system consists of three modules in `quartz/util/`:

1. **`iconConfig.ts`** - Centralized icon-to-tag mappings
2. **`iconService.ts`** - Icon fetching and caching service
3. **`iconHelpers.ts`** - Utility functions for working with icons

## Configuration

Edit `quartz/util/iconConfig.ts` to add or modify icon mappings:

```typescript
export const TAG_ICON_CONFIG: TagIconConfig[] = [
  { tag: "private", icon: "mdi:lock" },
  { tag: "engineering/python", icon: "mdi:language-python" },
  // Add more mappings here...
]
```

**Key points:**
- Order matters: First matching tag gets priority when a post has multiple tagged icons
- Icon format: `"provider:icon-name"`
  - `mdi:icon-name` for Material Design Icons (via CDN)
  - `custom:icon-name` for custom SVG files in `quartz/static/icons/`
- Tag names match frontmatter tags exactly (e.g., `"engineering/python"` for hierarchical tags)

### Adding Custom Icons

For tags that don't have a suitable Material Design Icon, you can add custom SVGs:

1. **Add your SVG file** to `quartz/static/icons/my-icon.svg`
   - Use simple, single-path SVGs for best results
   - Don't include `fill` attributes (icons are tinted programmatically)
   
2. **Reference in config** using `custom:my-icon`:
   ```typescript
   { tag: "my-tag", icon: "custom:my-icon" }
   ```

3. **Build and deploy** - custom icons are automatically copied to `/static/icons/` during build

## Usage in Components

### Basic Usage

```typescript
import { IconService } from "../../util/iconService"
import { getIconForTags } from "../../util/iconHelpers"

// Get icon identifier for tags
const tags = ["private", "engineering/python"]
const iconId = getIconForTags(tags) // Returns "mdi:lock" (private has higher priority)

// Fetch icon data
if (iconId) {
  const iconData = await IconService.getIcon(iconId)
  if (iconData) {
    // Use iconData.svgContent for raw SVG string
    // Use iconData.dataUri for data URI (e.g., in <img> src)
    console.log(iconData.svgContent)
    console.log(iconData.dataUri)
  }
}
```

### Example: Adding Icons to TagList

Here's how you could extend `TagList.tsx` to show icons:

```tsx
import { IconService } from "../util/iconService"
import { getIconForTag } from "../util/iconHelpers"

const TagList: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const tags = fileData.frontmatter?.tags
  const [tagIcons, setTagIcons] = useState<Map<string, string>>(new Map())

  // Load icons for tags
  useEffect(() => {
    async function loadIcons() {
      const iconMap = new Map<string, string>()
      for (const tag of tags || []) {
        const iconId = getIconForTag(tag)
        if (iconId) {
          const iconData = await IconService.getIcon(iconId)
          if (iconData) {
            iconMap.set(tag, iconData.svgContent)
          }
        }
      }
      setTagIcons(iconMap)
    }
    loadIcons()
  }, [tags])

  if (tags && tags.length > 0) {
    return (
      <ul class={classNames(displayClass, "tags")}>
        {tags.map((tag) => {
          const linkDest = resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)
          const iconSvg = tagIcons.get(tag)
          return (
            <li>
              <a href={linkDest} class="internal tag-link">
                {iconSvg && <span dangerouslySetInnerHTML={{ __html: iconSvg }} />}
                {tag}
              </a>
            </li>
          )
        })}
      </ul>
    )
  } else {
    return null
  }
}
```

**Note:** Since Quartz uses Preact without hooks, you'd need to adapt this pattern to work with component lifecycle or use inline scripts.

### Preloading Icons

For better performance, preload all configured icons at startup:

```typescript
import { IconService } from "../../util/iconService"
import { getAllConfiguredIcons } from "../../util/iconHelpers"

// Preload all icons
await IconService.preloadIcons(getAllConfiguredIcons())
```

## API Reference

### `iconHelpers.ts`

#### `getIconForTags(tags: string[]): string | null`
Returns the icon identifier for the first matching tag (respecting priority order).

#### `getIconForTag(tag: string): string | null`
Returns the icon identifier for a specific tag, or null if not configured.

#### `hasIconForTag(tag: string): boolean`
Checks if a tag has an icon configured.

#### `getAllConfiguredIcons(): string[]`
Returns all unique icon identifiers from the configuration.

### `iconService.ts`

#### `IconService.getIcon(iconId: string): Promise<IconCacheEntry | null>`
Fetches an icon (from cache or network) and returns SVG content and data URI.

#### `IconService.preloadIcons(iconIds: string[]): Promise<void>`
Preloads multiple icons into the cache.

#### `IconService.clearCache(): void`
Clears the icon cache.

## Supported Icon Providers

### Material Design Icons (MDI)

- **Provider ID:** `mdi`
- **Format:** `"mdi:icon-name"`
- **Source:** [Material Design Icons](https://pictogrammers.com/library/mdi/)
- **CDN:** jsDelivr (`@mdi/svg` package)

**Examples:**
- `"mdi:lock"` - Lock icon
- `"mdi:language-python"` - Python logo
- `"mdi:chart-line"` - Line chart icon

Browse all available icons at: https://pictogrammers.com/library/mdi/

### Adding New Providers

To add support for a new icon provider:

1. Update the `IconProvider` type in `iconService.ts`
2. Add URL builder logic in `getIconUrl()` method
3. Test with sample icons

## Graph Integration

The graph component automatically:
1. Preloads all configured icons at render time
2. Determines which icon to use for each node based on its tags
3. Renders icons as Pixi sprites centered on nodes
4. Sizes icons to 70% of node diameter

Icons appear on both tag nodes and post nodes based on their tags.

## Best Practices

1. **Keep configuration centralized** - All icon mappings should be in `iconConfig.ts`
2. **Respect priority order** - Place higher-priority tags first in `TAG_ICON_CONFIG`
3. **Preload when possible** - Use `preloadIcons()` to avoid loading delays
4. **Handle missing icons gracefully** - Always check for `null` returns from `getIcon()`
5. **Test with real data** - Ensure icon mappings match actual tag names in content
