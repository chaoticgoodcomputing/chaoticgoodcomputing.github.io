/**
 * Client-side script for Counter widget.
 * 
 * This script:
 * 1. Finds all counter widgets on the page
 * 2. Reads initial state from data attributes
 * 3. Attaches click handlers for interactivity
 * 4. Updates the DOM when state changes
 */

interface CounterState {
  count: number
  label: string
}

function initializeCounter(element: HTMLElement): void {
  // Read initial state from data attributes
  const initial = parseInt(element.dataset.initial || "0", 10)
  const label = element.dataset.label || "Count"
  
  const state: CounterState = {
    count: initial,
    label: label,
  }
  
  // Find the button element
  const button = element.querySelector<HTMLButtonElement>(".counter-button")
  if (!button) return
  
  // Update button text
  function updateButton(): void {
    if (button) {
      button.textContent = `${state.label}: ${state.count}`
    }
  }
  
  // Attach click handler
  button.addEventListener("click", () => {
    state.count++
    updateButton()
  })
}

// Initialize all counter widgets
function initializeAllCounters(): void {
  document.querySelectorAll<HTMLElement>(".widget-counter").forEach(initializeCounter)
}

// Initialize on both page load and navigation
document.addEventListener("nav", initializeAllCounters)
window.addEventListener("load", initializeAllCounters)
