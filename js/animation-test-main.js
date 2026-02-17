import { loadScript } from './bootstrap.js';

await loadScript('js/lib/trackballcontrols-no-scroll.js');
await loadScript('js/lib/fold.js');
await loadScript('js/lib/earcut.min.js');
await loadScript('js/lib/SVGLoader.js');
await loadScript('js/lib/origami-simulator.js');
await loadScript('js/lib/rabbit-ear.js');

// -- Inline app code (moved from animation-test.html) --

import { createSonobeAnimationSequence } from './sonobe-animation.js';

let simulator;
let sequence;
const viewport = document.getElementById('viewport');
const playBtn = document.getElementById('play-btn');
const label = document.getElementById('frame-label');

// Init Simulator
simulator = OrigamiSimulator({
  parent: viewport,
  simulationRunning: true,
  backgroundColor: "0d0d1a",
  color1: "4488cc",
  color2: "336699"
});
window.simulator = simulator;

// Generate sequence (rabbit-ear is loaded by now)
sequence = createSonobeAnimationSequence(window.ear);
window.sequence = sequence;
if (sequence && sequence.length > 0) {
  simulator.loadFOLD(JSON.parse(JSON.stringify(sequence[0])));
  label.textContent = "Step: 0 (Flat)";
}

async function playSequence() {
  if (!sequence) return;
  playBtn.disabled = true;

  for (let i = 0; i < sequence.length; i++) {
    const fold = sequence[i];
    label.textContent = `Step: ${i} (${fold.frame_title})`;

    // Load the step geometry (using a copy to prevent mutation issues)
    simulator.loadFOLD(JSON.parse(JSON.stringify(fold)));

    // Animate the fold from 0 to 1
    for (let p = 0; p <= 100; p += 4) {
      simulator.foldPercent = p / 100;
      await new Promise(r => requestAnimationFrame(r));
    }

    await new Promise(r => setTimeout(r, 600)); // Pause at end of step
  }

  playBtn.disabled = false;
}

playBtn.onclick = playSequence;
