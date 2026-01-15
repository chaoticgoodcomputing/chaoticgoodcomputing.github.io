/**
 * Client-side script for Initialization widget.
 * 
 * Updates status to confirm content widget system initialization.
 */

function initializeContentInit(element: HTMLElement): void {
  const statusItem = element.querySelector<HTMLElement>(".init-status-item")
  
  if (!statusItem) return
  
  const checkbox = statusItem.querySelector(".init-checkbox")
  const text = statusItem.querySelector(".init-text")
  
  if (!checkbox || !text) return
  
  // Check if any content-specific widgets exist (greeting, etc.)
  const hasContentWidgets = document.querySelector('.greeting-box, .annotation-viewer')
  
  if (hasContentWidgets) {
    checkbox.textContent = "✅"
    text.textContent = "Content widget system initialized"
    statusItem.style.color = "#22c55e"
  } else {
    checkbox.textContent = "ℹ️"
    text.textContent = "Content widget system ready (no content widgets on page)"
    statusItem.style.color = "#94a3b8"
  }
}

// Initialize all content-initialization widgets
function initializeAll(): void {
  document.querySelectorAll<HTMLElement>(".widget-content-initialization").forEach(initializeContentInit)
}

// Initialize on both page load and navigation
document.addEventListener("nav", initializeAll)
window.addEventListener("load", initializeAll)

// Also initialize immediately when script loads
initializeAll()
