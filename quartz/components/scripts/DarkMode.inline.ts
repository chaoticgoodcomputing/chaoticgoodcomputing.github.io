/**
 * Get the user's preferred theme from system settings or localStorage
 */
function _getUserPreferredTheme(): "light" | "dark" {
  const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  return (localStorage.getItem("theme") as "light" | "dark") ?? userPref
}

/**
 * Emit a theme change event for other components to react to
 */
function _emitThemeChangeEvent(theme: "light" | "dark") {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

/**
 * Apply theme to document and persist to localStorage
 */
function _applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("saved-theme", theme)
  localStorage.setItem("theme", theme)
  _emitThemeChangeEvent(theme)
}

/**
 * Toggle between light and dark themes
 */
function _switchTheme() {
  const currentTheme = document.documentElement.getAttribute("saved-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"
  _applyTheme(newTheme)
}

/**
 * Handle system color scheme preference changes
 */
function _handleSystemThemeChange(e: MediaQueryListEvent) {
  const newTheme = e.matches ? "dark" : "light"
  _applyTheme(newTheme)
}

// Initialize theme on page load (before DOM ready)
const currentTheme = _getUserPreferredTheme()
document.documentElement.setAttribute("saved-theme", currentTheme)

// MARK: MAIN

/**
 * Initialize dark mode toggle buttons and system preference listeners
 */
function setupDarkmode() {
  // Add click handlers to all darkmode toggle buttons
  for (const darkmodeButton of document.getElementsByClassName("darkmode")) {
    darkmodeButton.addEventListener("click", _switchTheme)
    window.addCleanup(() => darkmodeButton.removeEventListener("click", _switchTheme))
  }

  // Listen for changes in system color scheme preference
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  colorSchemeMediaQuery.addEventListener("change", _handleSystemThemeChange)
  window.addCleanup(() =>
    colorSchemeMediaQuery.removeEventListener("change", _handleSystemThemeChange),
  )
}

document.addEventListener("nav", setupDarkmode)
