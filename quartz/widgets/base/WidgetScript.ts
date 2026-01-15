/**
 * Abstract base class for widget client-side scripts.
 * 
 * Enforces the pattern:
 * 1. Each widget instance is initialized via initializeInstance()
 * 2. Event listeners are cleaned up properly via cleanup handlers
 * 3. Scripts respond to both "nav" and "load" events for SPA support
 * 4. Initialization happens immediately on script load
 * 
 * Usage:
 * ```typescript
 * class MyWidgetScript extends WidgetScript {
 *   protected getSelector(): string {
 *     return ".widget-my-widget"
 *   }
 * 
 *   protected initializeInstance(element: HTMLElement): void {
 *     const button = element.querySelector("button")
 *     if (!button) return
 * 
 *     const onClick = () => console.log("Clicked!")
 *     button.addEventListener("click", onClick)
 *     this.addCleanup(element, () => {
 *       button.removeEventListener("click", onClick)
 *     })
 *   }
 * }
 * 
 * new MyWidgetScript().initialize()
 * ```
 */
export abstract class WidgetScript {
  private cleanupHandlers = new WeakMap<HTMLElement, (() => void)[]>()
  
  /**
   * Get the CSS selector for finding widget instances.
   * Should target a unique class on the widget's root element.
   */
  protected abstract getSelector(): string
  
  /**
   * Initialize a single widget instance.
   * This method should:
   * 1. Query for child elements within the provided element
   * 2. Attach event listeners
   * 3. Call addCleanup() for each listener to ensure proper cleanup
   * 
   * @param element - The widget root element
   */
  protected abstract initializeInstance(element: HTMLElement): void
  
  /**
   * Register a cleanup function for a widget instance.
   * Called automatically during SPA navigation to prevent memory leaks.
   * 
   * @param element - The widget root element
   * @param cleanup - Function to remove event listeners, intervals, etc.
   */
  protected addCleanup(element: HTMLElement, cleanup: () => void): void {
    const handlers = this.cleanupHandlers.get(element) || []
    handlers.push(cleanup)
    this.cleanupHandlers.set(element, handlers)
  }
  
  /**
   * Clean up a widget instance before it's removed or re-initialized.
   */
  private cleanupInstance(element: HTMLElement): void {
    const handlers = this.cleanupHandlers.get(element)
    if (handlers) {
      handlers.forEach((cleanup) => cleanup())
      this.cleanupHandlers.delete(element)
    }
  }
  
  /**
   * Initialize all widget instances on the page.
   * Automatically cleans up old instances before re-initializing.
   */
  private initializeAll(): void {
    const elements = document.querySelectorAll<HTMLElement>(this.getSelector())
    elements.forEach((element) => {
      this.cleanupInstance(element)
      this.initializeInstance(element)
    })
  }
  
  /**
   * Set up global event listeners and run initial initialization.
   * Call this once at the end of your widget script file.
   */
  public initialize(): void {
    const boundInit = this.initializeAll.bind(this)
    
    // Initialize on both page load and SPA navigation
    document.addEventListener("nav", boundInit)
    window.addEventListener("load", boundInit)
    
    // Register cleanup for the global listeners
    window.addCleanup(() => {
      document.removeEventListener("nav", boundInit)
      window.removeEventListener("load", boundInit)
    })
    
    // Initialize immediately when script loads
    boundInit()
  }
}
