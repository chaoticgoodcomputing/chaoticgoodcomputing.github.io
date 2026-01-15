/**
 * Widget Script Helper Utilities
 * 
 * Copy this code block into your widget script to get type-safe, memory-leak-free
 * widget initialization. This avoids import issues with inline scripts.
 * 
 * Usage:
 * ```typescript
 * // 1. Copy the createWidgetScript function into your script file
 * 
 * // 2. Use it to create your widget
 * const myWidget = createWidgetScript({
 *   selector: ".widget-my-widget",
 *   initialize: (element) => {
 *     const button = element.querySelector("button")
 *     if (!button) return
 * 
 *     const onClick = () => console.log("Clicked!")
 *     button.addEventListener("click", onClick)
 * 
 *     return () => {
 *       button.removeEventListener("click", onClick)
 *     }
 *   }
 * })
 * 
 * // 3. Initialize
 * myWidget.start()
 * ```
 */

interface WidgetScriptConfig {
  /** CSS selector for finding widget instances */
  selector: string
  
  /**
   * Initialize a single widget instance.
   * Return a cleanup function that will be called before re-initialization.
   */
  initialize: (element: HTMLElement) => (() => void) | void
}

/**
 * Creates a widget script with proper cleanup and event handling.
 * 
 * Benefits:
 * - Automatic cleanup on SPA navigation
 * - No duplicate event listeners
 * - Consistent initialization pattern
 * - Type-safe configuration
 */
function createWidgetScript(config: WidgetScriptConfig) {
  const cleanupHandlers = new WeakMap<HTMLElement, () => void>()
  
  function cleanupInstance(element: HTMLElement): void {
    const cleanup = cleanupHandlers.get(element)
    if (cleanup) {
      cleanup()
      cleanupHandlers.delete(element)
    }
  }
  
  function initializeAll(): void {
    const elements = document.querySelectorAll<HTMLElement>(config.selector)
    elements.forEach((element) => {
      // Clean up old instance first
      cleanupInstance(element)
      
      // Initialize new instance
      const cleanup = config.initialize(element)
      if (cleanup) {
        cleanupHandlers.set(element, cleanup)
      }
    })
  }
  
  return {
    /**
     * Start the widget script.
     * Call this once at the end of your script file.
     */
    start() {
      // Initialize on both page load and SPA navigation
      document.addEventListener("nav", initializeAll)
      window.addEventListener("load", initializeAll)
      
      // Register cleanup for the global listeners
      window.addCleanup(() => {
        document.removeEventListener("nav", initializeAll)
        window.removeEventListener("load", initializeAll)
      })
      
      // Initialize immediately when script loads
      initializeAll()
    }
  }
}
