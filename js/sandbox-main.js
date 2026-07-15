import { loadScript, showFatalError } from './bootstrap.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
THREE.TransformControls = TransformControls;

try {
  await loadScript('js/lib/trackballcontrols-no-scroll.js');

  await import('./sandbox.js');
} catch (error) {
  showFatalError('Failed to load the sandbox. Please reload the page.', error);
}
