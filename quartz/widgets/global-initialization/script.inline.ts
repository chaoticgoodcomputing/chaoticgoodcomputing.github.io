/**
 * Client-side script for GlobalInitialization widget.
 * 
 * Updates status to confirm global widget system initialization.
 */

function initializeGlobalInit(element: HTMLElement): void {
  const statusItem = element.querySelector<HTMLElement>(".init-status-item")
  
  if (!statusItem) return
  
  const checkbox = statusItem.querySelector(".init-checkbox")
  const text = statusItem.querySelector(".init-text")
  
  if (!checkbox || !text) return
  
  // Check if any widgets exist (excluding this one)
  const hasWidgets = document.querySelector('[data-widget]:not([data-widget="global-initialization"])')
  
  if (hasWidgets) {
    checkbox.textContent = "✅"
    text.textContent = "Global widget system initialized"
    statusItem.style.color = "#22c55e"
  } else {
    checkbox.textContent = "ℹ️"
    text.textContent = "Global widget system ready (no widgets on page)"
    statusItem.style.color = "#94a3b8"
  }
}

// Initialize all global-initialization widgets
function initializeAll(): void {
  document.querySelectorAll<HTMLElement>(".widget-global-initialization").forEach(initializeGlobalInit)
}

// Initialize on both page load and navigation
document.addEventListener("nav", initializeAll)
window.addEventListener("load", initializeAll)

// Also initialize immediately when script loads
initializeAll()
