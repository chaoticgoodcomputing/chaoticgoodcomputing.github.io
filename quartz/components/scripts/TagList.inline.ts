/**
 * TagList inline script
 * 
 * Populates tag badges with:
 * - Colors from TagIndex metadata
 * - Icons from TagIndex metadata (rendered via IconService)
 * - Post counts (if enabled)
 * - Proper links to tag pages
 */

import type { TagIndex } from "../../util/tags"
import { IconService } from "../../util/iconService"

// Global variable injected by renderPage.tsx
declare const fetchTagData: Promise<any>

/**
 * Initialize all tag lists on the page or within a container
 * @param container - Optional container element to search within (defaults to document)
 */
async function setupTagList(container?: HTMLElement | Document) {
  const root = container || document
  const allTagLists = root.querySelectorAll("ul.tags[data-showtags='true']") as NodeListOf<
    HTMLUListElement
  >

  if (allTagLists.length === 0) return

  try {
    console.log("TagList: Fetching TagIndex...")
    const tagIndex = (await fetchTagData) as TagIndex
    console.log("TagList: TagIndex loaded")

    for (const tagList of allTagLists) {
      const showCount = tagList.dataset.showcount === "true"
      const showSubtags = tagList.dataset.showsubtags === "true"
      const currentSlug = tagList.dataset.currentslug || ""

      // Determine which tags to render for this list
      let tagsForList: string[] = []

      if (showSubtags && currentSlug) {
        const tagName = currentSlug.replace(/^tags\//, "").replace(/\/index$/, "").replace(/\/+$/, "")
        const meta = tagIndex.tags[tagName]
        if (meta) {
          tagsForList = meta.children
        }
      } else {
        const existingItems = tagList.querySelectorAll("li.tag-item") as NodeListOf<HTMLLIElement>
        tagsForList = Array.from(existingItems)
          .map((el) => el.dataset.tag)
          .filter((t): t is string => !!t)
      }

      // If showing subtags, rebuild the list with child tags
      if (showSubtags) {
        tagList.innerHTML = ""
        for (const tag of tagsForList) {
          const li = document.createElement("li")
          li.className = "tag-item"
          li.dataset.tag = tag

          const a = document.createElement("a")
          a.className = "internal tag-link"
          a.href = "#"

          const iconSpan = document.createElement("span")
          iconSpan.className = "tag-icon-badge"

          const nameSpan = document.createElement("span")
          nameSpan.className = "tag-name"

          const countSpan = document.createElement("span")
          countSpan.className = "tag-count"

          a.append(iconSpan, nameSpan, countSpan)
          li.appendChild(a)
          tagList.appendChild(li)
        }
      }

      // Collect icons to preload for this list
      const iconsToLoad = new Set<string>()
      const tagItems = tagList.querySelectorAll("li.tag-item") as NodeListOf<HTMLLIElement>
      for (const tagItem of tagItems) {
        const tagName = tagItem.dataset.tag
        if (!tagName) continue
        const metadata = tagIndex.tags[tagName]
        if (metadata?.icon) {
          iconsToLoad.add(metadata.icon)
        }
      }

      if (iconsToLoad.size > 0) {
        await IconService.preloadIcons(Array.from(iconsToLoad))
      }

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

    console.log("TagList: Setup complete")
  } catch (err) {
    console.error("Error initializing TagList:", err)
    if (err instanceof Error) {
      console.error("Error message:", err.message)
      console.error("Error stack:", err.stack)
    }
  }
}

// Expose setup function for popover re-use
;(window as any).setupTagList = setupTagList

// Set up on initial page load
document.addEventListener("nav", async (_e: CustomEventMap["nav"]) => {
  await setupTagList()
})

// Also run immediately in case nav event already fired
setupTagList()
