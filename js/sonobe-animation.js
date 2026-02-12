import { buildGrid, getSonobeForStep } from './sonobe.js';

/**
 * Prototype: Returns a sequence of complete FOLD objects representing the folding steps.
 * Uses the specialized meshes from the main tutorial for a mathematically correct sequence.
 */
export function createSonobeAnimationSequence(ear) {
  const sequence = [];

  // Initial flat state
  const f0 = buildGrid(0);
  f0.frame_title = "Flat Crease Pattern";
  sequence.push(f0);

  // Step 1: Edges to Center
  // Uses the full grid with horizontal creases
  const f1 = getSonobeForStep('step1', 1);
  f1.frame_title = "Step 1: Edges to Center";
  sequence.push(f1);

  // Step 2: Diagonal Folds
  // Uses the narrow strip mesh
  const f2 = getSonobeForStep('step2', 1);
  f2.frame_title = "Step 2: Diagonal Folds";
  sequence.push(f2);

  // Step 3: Fold in Half
  // Uses the parallelogram mesh with a vertical fold
  const f3 = getSonobeForStep('step3', 1);
  f3.frame_title = "Step 3: Fold in Half";
  sequence.push(f3);

  // Step 4: Finish Tabs
  // Uses the parallelogram mesh with tab fold lines
  const f4 = getSonobeForStep('step4', 1);
  f4.frame_title = "Step 4: Completed Unit";
  sequence.push(f4);

  return sequence;
}
