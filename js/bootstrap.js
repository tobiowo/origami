import * as THREE from 'three';
// ES module namespace is frozen — create a mutable copy so legacy scripts
// can add properties (e.g. THREE.SVGLoader, THREE.TransformControls)
window.THREE = Object.assign({}, THREE);

export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
