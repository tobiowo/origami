import { loadScript } from './bootstrap.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
THREE.TransformControls = TransformControls;

await loadScript('js/lib/trackballcontrols-no-scroll.js');

await import('./sandbox.js');
