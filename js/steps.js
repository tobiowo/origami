/**
 * Step definitions for the Sonobe cube tutorial.
 * Each step has: title, description (HTML), renderer type, and config.
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
    title: "Step 3: Fold in Half",
    description: `
      <p>Use the <strong>slider</strong> to fold the unit in half along its long center line.</p>
      <p>This gives the unit its final 3D V-shape that wraps around cube edges.</p>
    `,
    renderer: "simulator",
    foldPercent: null,
    sliderEnabled: true,
    stepFunc: "step3",
  },
  {
    title: "Step 4: Fold in Half & Create Tabs",
    description: `
      <p>Use the <strong>slider</strong> to fold the parallelogram in half along its long axis while also folding the triangular tips back at each corner.</p>
      <p>The center fold creates the V-shape, and the corner folds create the <strong>tabs</strong> that interlock with other units.</p>
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
      • <strong>Two pockets</strong> that receive tabs from neighbors.</p>
      <p>The number of units you'll need depends on the shape you want to build (3 for a jewel, 6 for a cube, 12 for an octahedron, or 30 for an icosahedron).</p>
    `,
    renderer: "simulator",
    foldPercent: 1,
    sliderEnabled: false,
    stepFunc: "step4",
  },

  // --- Assembly steps ---
  {
    title: "First Unit",
    description: `
      <p>Place the first Sonobe unit as the foundation. This <strong style="color:#e74c3c">red unit</strong> will form one face of the cube.</p>
      <p><strong>Click and drag</strong> to rotate the view. <strong>Scroll</strong> to zoom.</p>
    `,
    renderer: "assembly",
    unitCount: 1,
  },
  {
    title: "Add Second Unit",
    description: `
      <p>The <strong style="color:#3498db">blue unit</strong> connects perpendicular to the first. Its tab slides into the red unit's pocket.</p>
      <p>Notice how the two units form an "L" shape.</p>
    `,
    renderer: "assembly",
    unitCount: 2,
  },
  {
    title: "Add Third Unit",
    description: `
      <p>The <strong style="color:#2ecc71">green unit</strong> completes the first corner. Three units meet at each vertex of the cube.</p>
    `,
    renderer: "assembly",
    unitCount: 3,
  },
  {
    title: "Add Fourth Unit",
    description: `
      <p>The <strong style="color:#f39c12">orange unit</strong> starts forming the opposite side. Halfway there!</p>
    `,
    renderer: "assembly",
    unitCount: 4,
  },
  {
    title: "Add Fifth Unit",
    description: `
      <p>The <strong style="color:#9b59b6">purple unit</strong> connects more faces. The cube shape is becoming clear.</p>
    `,
    renderer: "assembly",
    unitCount: 5,
  },
  {
    title: "Complete Cube!",
    description: `
      <p>The final <strong style="color:#1abc9c">teal unit</strong> closes the cube. All 6 units interlock!</p>
      <p>Congratulations! You've assembled a <strong>Sonobe cube</strong>. Rotate it to admire your work.</p>
      <p>This same module can build other shapes: octahedra (12 units), icosahedra (30 units), and more.</p>
    `,
    renderer: "assembly",
    unitCount: 6,
  },
];
