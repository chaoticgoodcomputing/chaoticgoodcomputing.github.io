/**
 * Client-side script for InitCheck widget.
 * 
 * Updates status indicators to confirm global and content widget initialization.
 */

function initializeInitCheck(element: HTMLElement): void {
  const globalStatus = element.querySelector<HTMLElement>(".init-status-item.global-widgets")
  const contentStatus = element.querySelector<HTMLElement>(".init-status-item.content-widgets")
  
  if (!globalStatus || !contentStatus) return
  
  // Check if global widgets are initialized (presence of any global widget)
  const hasGlobalWidgets = document.querySelector('[data-widget]:not([data-widget="init-check"])')
  if (hasGlobalWidgets) {
    const checkbox = globalStatus.querySelector(".init-checkbox")
    const text = globalStatus.querySelector(".init-text")
    if (checkbox && text) {
      checkbox.textContent = "✅"
      text.textContent = "Global widget system initialized"
      globalStatus.style.color = "#22c55e"
    }
  }
  
  // Check if content widgets are initialized (presence of content-specific widgets)
  const hasContentWidgets = document.querySelector('.greeting-box, .annotation-viewer')
  if (hasContentWidgets) {
    const checkbox = contentStatus.querySelector(".init-checkbox")
    const text = contentStatus.querySelector(".init-text")
    if (checkbox && text) {
      checkbox.textContent = "✅"
      text.textContent = "Content widget system initialized"
      contentStatus.style.color = "#22c55e"
    }
  }
  
  // If no content widgets found, mark as ready but not used
  if (!hasContentWidgets) {
    const checkbox = contentStatus.querySelector(".init-checkbox")
    const text = contentStatus.querySelector(".init-text")
    if (checkbox && text) {
      checkbox.textContent = "ℹ️"
      text.textContent = "No content widgets on this page"
      contentStatus.style.color = "#94a3b8"
    }
  }
}

// Initialize all init-check widgets
function initializeAllInitChecks(): void {
  document.querySelectorAll<HTMLElement>(".widget-init-check").forEach(initializeInitCheck)
}

// Initialize on both page load and navigation
document.addEventListener("nav", initializeAllInitChecks)
window.addEventListener("load", initializeAllInitChecks)

// Also initialize immediately when script loads (for SPA navigation)
initializeAllInitChecks()
