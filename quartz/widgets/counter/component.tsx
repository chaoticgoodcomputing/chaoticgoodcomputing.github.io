import { JSX } from "preact"

export interface CounterProps {
  initial?: number
  label?: string
}

/**
 * Counter widget - a simple button that increments a count.
 * 
 * This is a minimal example widget demonstrating:
 * - Server-side rendering of static HTML placeholder
 * - Client-side hydration and interactivity
 * - Data attribute passing from server to client
 * 
 * @example
 * ```mdx
 * import { Counter } from '@widgets/counter'
 * 
 * <Counter initial={0} label="Clicks" />
 * ```
 */
export function Counter({ initial = 0, label = "Count" }: CounterProps): JSX.Element {
  return (
    <div 
      class="widget-counter" 
      data-widget="counter"
      data-initial={initial.toString()}
      data-label={label}
    >
      <button class="counter-button">
        {label}: {initial}
      </button>
    </div>
  )
}
