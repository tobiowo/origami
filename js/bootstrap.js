import * as THREE from 'three';
// ES module namespace is frozen — create a mutable copy so legacy scripts
// can add properties (e.g. THREE.SVGLoader, THREE.TransformControls)
window.THREE = Object.assign({}, THREE);

export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Surface an unrecoverable startup error to the user instead of leaving the
 * page stuck on the loading spinner. Logs the underlying error for debugging.
 */
export function showFatalError(message, error) {
  console.error(message, error);

  const overlay = document.getElementById('loading-overlay');
  const spinner = overlay && overlay.querySelector('.spinner');
  if (spinner) spinner.style.display = 'none';
  if (overlay) overlay.classList.remove('hidden');

  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  box.style.cssText =
    'max-width:80%;margin:auto;padding:16px 20px;color:#fff;background:#c0392b;' +
    'border-radius:8px;font-family:sans-serif;font-size:0.9rem;text-align:center;';
  box.textContent = message;
  (overlay || document.body).appendChild(box);
}
