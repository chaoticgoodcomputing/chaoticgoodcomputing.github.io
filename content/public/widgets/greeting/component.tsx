import { JSX } from "preact"

export interface GreetingProps {
  name?: string
}

/**
 * Greeting widget - a vault-specific example widget.
 * 
 * This demonstrates how widgets can be created in the content
 * directory for page-specific or tutorial-specific use cases.
 * 
 * @example
 * ```mdx
 * import { Greeting } from '@content/widgets/greeting'
 * 
 * <Greeting name="World" />
 * ```
 */
export function Greeting({ name = "Friend" }: GreetingProps): JSX.Element {
  return (
    <div 
      class="widget-greeting" 
      data-widget="greeting"
      data-name={name}
    >
      <div class="greeting-box">
        <p>Hello, <span class="greeting-name">{name}</span>!</p>
        <button class="greeting-button">Change Greeting</button>
      </div>
    </div>
  )
}
