import { JSX } from "preact"

/**
 * InitCheck widget - displays widget initialization status.
 * 
 * Shows separate status indicators for global and content widgets,
 * updating with checkboxes when each system initializes.
 * 
 * @example
 * ```mdx
 * import { InitCheck } from '@widgets/init-check'
 * 
 * <InitCheck />
 * ```
 */
export function InitCheck(): JSX.Element {
  return (
    <div className="widget-init-check" data-widget="init-check">
      <div className="init-status-container">
        <div className="init-status-item global-widgets">
          <span className="init-checkbox">⏳</span>
          <span className="init-text">Loading global widget system...</span>
        </div>
        <div className="init-status-item content-widgets">
          <span className="init-checkbox">⏳</span>
          <span className="init-text">Loading content widget system...</span>
        </div>
      </div>
    </div>
  )
}
