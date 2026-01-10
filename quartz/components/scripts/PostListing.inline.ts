/**
 * PostListing inline script
 * 
 * Populates tag badges in post listings with:
 * - Colors from TagIndex metadata
 * - Icons from TagIndex metadata (rendered via IconService)
 * - Post counts (optional)
 * - Proper links to tag pages
 */

import type { TagIndex } from "../../util/tags"
import { IconService } from "../../util/iconService"

// Global variable injected by renderPage.tsx
declare const fetchTagData: Promise<any>

/**
 * Initialize all tag lists in post listings
 */
async function setupPostListingTags() {
  const allTagLists = document.querySelectorAll("ul.tags[data-component='post-listing']") as NodeListOf<
    HTMLUListElement
  >

  if (allTagLists.length === 0) return

  try {
    const tagIndex = (await fetchTagData) as TagIndex

    // Collect all unique icons to preload
    const iconsToLoad = new Set<string>()
    for (const tagList of allTagLists) {
      const tagItems = tagList.querySelectorAll("li.tag-item") as NodeListOf<HTMLLIElement>
      for (const tagItem of tagItems) {
        const tagName = tagItem.dataset.tag
        if (!tagName) continue
        const metadata = tagIndex.tags[tagName]
        if (metadata?.icon) {
          iconsToLoad.add(metadata.icon)
        }
      }
    }

    // Preload all icons
    if (iconsToLoad.size > 0) {
      await IconService.preloadIcons(Array.from(iconsToLoad))
    }

    for (const tagList of allTagLists) {
      const showCount = tagList.dataset.showcount === "true"

      const tagItems = tagList.querySelectorAll("li.tag-item") as NodeListOf<HTMLLIElement>

      for (const tagItem of tagItems) {
        const tagName = tagItem.dataset.tag
        if (!tagName) continue

        const metadata = tagIndex.tags[tagName]
        if (!metadata) continue

        const link = tagItem.querySelector("a.tag-link") as HTMLAnchorElement
        if (!link) continue

        // Set the link destination
        link.href = `/tags/${tagName}/`

        // Update icon badge
        const iconBadge = link.querySelector(".tag-icon-badge") as HTMLElement
        const color = metadata.color || "#888888"
        iconBadge.style.borderColor = color
        iconBadge.setAttribute("title", tagName)

        // Render icon if available
        if (metadata.icon) {
          const iconData = await IconService.getIcon(metadata.icon)
          if (iconData) {
            iconBadge.innerHTML = iconData.svgContent
            // Ensure the SVG has proper sizing and coloring
            const svg = iconBadge.querySelector("svg") as SVGElement
            if (svg) {
              svg.setAttribute("width", "18")
              svg.setAttribute("height", "18")
              // Set fill color to match border
              svg.style.fill = color
            }
          }
        }

        // Update tag name
        const nameSpan = link.querySelector(".tag-name") as HTMLElement
        const segment = tagName.split("/").pop() || tagName
        nameSpan.textContent = segment

        // Update count if enabled
        if (showCount) {
          const countSpan = link.querySelector(".tag-count") as HTMLElement
          countSpan.textContent = `(${metadata.totalPostCount})`
        } else {
          const countSpan = link.querySelector(".tag-count") as HTMLElement
          countSpan?.remove()
        }
      }
    }
  } catch (err) {
    console.error("Error initializing PostListing tags:", err)
    if (err instanceof Error) {
      console.error("Error message:", err.message)
      console.error("Error stack:", err.stack)
    }
  }
}

// Initialize on page load and navigation
document.addEventListener("nav", setupPostListingTags)
