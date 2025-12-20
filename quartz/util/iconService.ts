/**
 * Icon service for fetching and caching SVG icons from various providers.
 * 
 * Supports:
 * - Material Design Icons (MDI) via CDN
 * - Extensible to other icon providers
 * 
 * Icons are cached in memory to avoid repeated network requests.
 */

type IconProvider = "mdi" | "custom"

interface IconCacheEntry {
  svgContent: string
  dataUri: string
}

class IconServiceClass {
  private cache = new Map<string, IconCacheEntry>()
  
  /**
   * Parse an icon identifier into provider and icon name.
   * @param iconId - Icon identifier in format "provider:icon-name"
   * @returns Parsed provider and icon name, or null if invalid
   */
  private parseIconId(iconId: string): { provider: IconProvider; iconName: string } | null {
    const parts = iconId.split(":")
    if (parts.length !== 2) {
      console.warn(`Invalid icon identifier format: ${iconId}. Expected "provider:icon-name"`)
      return null
    }
    
    const [provider, iconName] = parts
    if (provider !== "mdi" && provider !== "custom") {
      console.warn(`Unknown icon provider: ${provider}. Supported: mdi, custom`)
      return null
    }
    
    return { provider: provider as IconProvider, iconName }
  }
  
  /**
   * Get the URL for fetching an icon from a provider.
   * @param provider - Icon provider
   * @param iconName - Icon name
   * @returns CDN URL for the icon
   */
  private getIconUrl(provider: IconProvider, iconName: string): string {
    switch (provider) {
      case "mdi":
        // Material Design Icons via jsDelivr CDN
        // Format: https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/{icon-name}.svg
        return `https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/${iconName}.svg`
      case "custom":
        // Custom icons from quartz/static/icons (copied to /static/icons at build)
        return `/static/icons/${iconName}.svg`
      default:
        throw new Error(`No URL builder for provider: ${provider}`)
    }
  }
  
  /**
   * Fetch an SVG icon from a provider.
   * @param iconId - Icon identifier in format "provider:icon-name"
   * @returns Promise resolving to SVG content, or null if fetch fails
   */
  private async fetchIcon(iconId: string): Promise<string | null> {
    const parsed = this.parseIconId(iconId)
    if (!parsed) return null
    
    const url = this.getIconUrl(parsed.provider, parsed.iconName)
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Failed to fetch icon ${iconId} from ${url}: ${response.status}`)
        return null
      }
      return await response.text()
    } catch (error) {
      console.warn(`Error fetching icon ${iconId}:`, error)
      return null
    }
  }
  
  /**
   * Get an icon as SVG content and data URI.
   * Results are cached to avoid repeated fetches.
   * @param iconId - Icon identifier in format "provider:icon-name"
   * @returns Promise resolving to cache entry with SVG content and data URI, or null if unavailable
   */
  async getIcon(iconId: string): Promise<IconCacheEntry | null> {
    // Check cache first
    if (this.cache.has(iconId)) {
      return this.cache.get(iconId)!
    }
    
    // Fetch icon
    let svgContent = await this.fetchIcon(iconId)
    if (!svgContent) return null
    
    // Remove existing fill attributes so we can set them uniformly
    svgContent = svgContent.replace(/\sfill="[^"]*"/g, '')
    
    // Add fill="white" to all <path> elements (global replacement)
    // This ensures all paths can be tinted by Pixi
    svgContent = svgContent.replace(/<path\s/g, '<path fill="white" ')
    
    // Also handle other shape elements that might need fills
    svgContent = svgContent.replace(/<circle\s/g, '<circle fill="white" ')
    svgContent = svgContent.replace(/<rect\s/g, '<rect fill="white" ')
    svgContent = svgContent.replace(/<ellipse\s/g, '<ellipse fill="white" ')
    svgContent = svgContent.replace(/<polygon\s/g, '<polygon fill="white" ')
    svgContent = svgContent.replace(/<polyline\s/g, '<polyline fill="white" ')
    
    // Create data URI
    const dataUri = `data:image/svg+xml;base64,${btoa(svgContent)}`
    
    // Cache result
    const entry: IconCacheEntry = { svgContent, dataUri }
    this.cache.set(iconId, entry)
    
    return entry
  }
  
  /**
   * Preload multiple icons into the cache.
   * Useful for preloading all configured icons at startup.
   * @param iconIds - Array of icon identifiers
   * @returns Promise that resolves when all icons are loaded (or failed)
   */
  async preloadIcons(iconIds: string[]): Promise<void> {
    await Promise.all(iconIds.map((id) => this.getIcon(id)))
  }
  
  /**
   * Clear the icon cache.
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const IconService = new IconServiceClass()
