/**
 * Step definitions for the Sonobe unit folding tutorial.
 * Each step has: title, description (HTML), renderer type, and config.
 * Assembly steps are generated dynamically in app.js from the selected
 * model's unit count.
 */

export const steps = [
  {
    title: "Folding Overview",
    description: `
      <p>Watch how a single square of paper is transformed into a <strong>Sonobe unit</strong>.</p>
      <p>This animation shows the complete folding sequence we'll be following. Click the button below to see the process in 3D.</p>
      <button id="btn-play-animation" style="width: 100%; padding: 10px; background: #e94560; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 10px;">Play Animation</button>
    `,
    renderer: "animation",
  },
  {
    title: "Square Base",
    description: `
      <p>We'll start with a single <strong>square sheet</strong> of paper.</p>
      <p>A Sonobe unit is typically folded from a square with a 1:1 aspect ratio. We'll fold 6 of these units and assemble them into a cube.</p>
    `,
    renderer: "simulator",
    foldPercent: 0,
    sliderEnabled: false,
  },
  {
    title: "Step 1: Edges to Center",
    description: `
      <p>Use the <strong>slider</strong> to fold the top and bottom edges toward the center horizontal line.</p>
      <p>This creates a long, narrow strip — the foundation of the Sonobe unit.</p>
    `,
    renderer: "simulator",
    foldPercent: null,
    sliderEnabled: true,
    stepFunc: "step1",
  },
  {
    title: "Step 2: Diagonal Folds",
    description: `
      <p>Use the <strong>slider</strong> to fold the diagonal creases. These mountain folds create the parallelogram shape with triangular tabs.</p>
      <p>The tabs at opposite corners will interlock with other units during assembly.</p>
    `,
    renderer: "simulator",
    foldPercent: null,
    sliderEnabled: true,
    stepFunc: "step2",
  },
  {
    title: "Step 3: Fold into a V",
    description: `
      <p>Use the <strong>slider</strong> to bend the parallelogram along its center crease.</p>
      <p>Stop before it folds flat — this V-shape is how the unit wraps around the edges of the finished model.</p>
    `,
    renderer: "simulator",
    foldPercent: null,
    sliderEnabled: true,
    stepFunc: "step3",
  },
  {
    title: "Step 4: Fold the Tabs Back",
    description: `
      <p>With the V in place, use the <strong>slider</strong> to fold the two triangular tips back at each corner.</p>
      <p>These are the <strong>tabs</strong> that slide into neighboring units during assembly.</p>
    `,
    renderer: "simulator",
    foldPercent: null,
    sliderEnabled: true,
    stepFunc: "step4",
  },
  {
    title: "Completed Unit",
    description: `
      <p>Here is your fully folded Sonobe unit! This versatile module is the building block for many modular origami shapes.</p>
      <p>It features:</p>
      <p>• <strong>Two triangular tabs</strong> that insert into neighboring units.<br>
      • <strong>Two pockets</strong> — the openings under the body folds where neighboring tabs slide in.</p>
      <p>The number of units you'll need depends on the shape you want to build (3 for a jewel, 6 for a cube, 12 for an octahedron, or 30 for an icosahedron).</p>
    `,
    renderer: "simulator",
    foldPercent: 1,
    sliderEnabled: false,
    stepFunc: "step4",
  },
];
