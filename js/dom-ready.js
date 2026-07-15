/**
 * Runs `init` once the DOM is ready. Handles both direct script loading
 * (before DOMContentLoaded) and dynamic import from the bootstrap loader
 * (after DOMContentLoaded has already fired).
 */
export function onDOMReady(init) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
