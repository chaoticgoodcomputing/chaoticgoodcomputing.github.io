import { getFullSlug } from "../../util/path"

/**
 * Generate a unique ID for a checkbox based on page slug and index
 */
function _checkboxId(index: number): string {
  return `${getFullSlug(window)}-checkbox-${index}`
}

/**
 * Save checkbox state to localStorage
 */
function _switchState(e: Event, elId: string) {
  const newCheckboxState = (e.target as HTMLInputElement)?.checked ? "true" : "false"
  localStorage.setItem(elId, newCheckboxState)
}

// MARK: MAIN

/**
 * Initialize all checkboxes on the page with persistent state
 */
function setupCheckboxes() {
  const checkboxes = document.querySelectorAll(
    "input.checkbox-toggle",
  ) as NodeListOf<HTMLInputElement>
  checkboxes.forEach((el, index) => {
    const elId = _checkboxId(index)

    const switchState = (e: Event) => _switchState(e, elId)

    el.addEventListener("change", switchState)
    window.addCleanup(() => el.removeEventListener("change", switchState))
    if (localStorage.getItem(elId) === "true") {
      el.checked = true
    }
  })
}

document.addEventListener("nav", setupCheckboxes)
