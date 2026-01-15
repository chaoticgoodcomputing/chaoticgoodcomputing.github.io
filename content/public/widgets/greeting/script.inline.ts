/**
 * Client-side script for Greeting widget.
 * 
 * Demonstrates vault-specific widget interactivity.
 */

const greetings = ["Hello", "Hi", "Hey", "Greetings", "Howdy", "Salutations"]

function initializeGreeting(element: HTMLElement): void {
  const name = element.dataset.name || "Friend"
  const nameSpan = element.querySelector<HTMLSpanElement>(".greeting-name")
  const button = element.querySelector<HTMLButtonElement>(".greeting-button")
  
  if (!nameSpan || !button) return
  
  let currentIndex = 0
  
  button.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % greetings.length
    const greeting = greetings[currentIndex]
    nameSpan.parentElement!.innerHTML = `${greeting}, <span class="greeting-name">${name}</span>!`
  })
}

// Initialize all greeting widgets
function initializeAllGreetings(): void {
  document.querySelectorAll<HTMLElement>(".widget-greeting").forEach(initializeGreeting)
}

// Initialize on both page load and navigation
document.addEventListener("nav", initializeAllGreetings)
window.addEventListener("load", initializeAllGreetings)
