// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

let isReaderMode = false

/**
 * Dispatch a reader mode change event
 */
function _emitReaderModeChangeEvent(mode: "on" | "off") {
  const event: CustomEventMap["readermodechange"] = new CustomEvent("readermodechange", {
    detail: { mode },
  })
  document.dispatchEvent(event)
}

/**
 * Toggle reader mode state and update DOM
 */
function _switchReaderMode() {
  isReaderMode = !isReaderMode
  const newMode = isReaderMode ? "on" : "off"
  document.documentElement.setAttribute("reader-mode", newMode)
  _emitReaderModeChangeEvent(newMode)
}

// ============================================================================
// MARK: MAIN
// ============================================================================

/**
 * Initialize reader mode functionality for all reader mode buttons
 */
function setupReaderMode() {
  for (const readerModeButton of document.getElementsByClassName("readermode")) {
    readerModeButton.addEventListener("click", _switchReaderMode)
    window.addCleanup(() => readerModeButton.removeEventListener("click", _switchReaderMode))
  }

  // Set initial state
  document.documentElement.setAttribute("reader-mode", isReaderMode ? "on" : "off")
}

document.addEventListener("nav", setupReaderMode)
