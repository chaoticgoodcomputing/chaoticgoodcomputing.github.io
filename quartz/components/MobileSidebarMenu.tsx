import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/mobileSidebarMenu.scss"
// @ts-ignore
import script from "./scripts/MobileSidebarMenu.inline"

/**
 * Mobile sidebar menu component that wraps the left sidebar content
 * and provides a hamburger button and retractable menu for mobile devices.
 * On desktop, this component is invisible and just passes through the children.
 */
export default (() => {
  const MobileSidebarMenu: QuartzComponent = ({ children }: QuartzComponentProps) => {
    return (
      <>
        {/* Hamburger button - visible only on mobile */}
        <button
          class="mobile-sidebar-toggle mobile-only"
          id="mobile-sidebar-toggle"
          aria-label="Toggle sidebar menu"
          aria-expanded="false"
        >
          <div class="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        {/* Backdrop overlay - visible only when menu is open on mobile */}
        <div class="mobile-sidebar-backdrop" id="mobile-sidebar-backdrop"></div>

        {/* The actual sidebar container */}
        <div class="mobile-sidebar-container" id="mobile-sidebar-container">
          {children}
        </div>
      </>
    )
  }

  MobileSidebarMenu.css = style
  MobileSidebarMenu.afterDOMLoaded = script

  return MobileSidebarMenu
}) satisfies QuartzComponentConstructor<QuartzComponent>
