import { loadScript } from './bootstrap.js';

await loadScript('js/lib/trackballcontrols-no-scroll.js');
await loadScript('js/lib/fold.js');
await loadScript('js/lib/earcut.min.js');
await loadScript('js/lib/SVGLoader.js');
await loadScript('js/lib/origami-simulator.js');
await loadScript('js/lib/rabbit-ear.js');

await import('./gv-app.js');
