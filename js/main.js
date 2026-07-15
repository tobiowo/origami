import { loadScript, showFatalError } from './bootstrap.js';

try {
  await loadScript('js/lib/trackballcontrols-no-scroll.js');
  await loadScript('js/lib/fold.js');
  await loadScript('js/lib/earcut.min.js');
  await loadScript('js/lib/SVGLoader.js');
  await loadScript('js/lib/origami-simulator.js');
  await loadScript('js/lib/rabbit-ear.js');

  await import('./app.js');
} catch (error) {
  showFatalError(
    'Failed to load the 3D engine. Please check your connection and reload the page.',
    error,
  );
}
