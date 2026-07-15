/**
 * Step definitions for the Keel unit tutorial (see plans/keel-unit.md).
 */

export const steps = [
  {
    title: "Paper Selection",
    description: `
      <p>The Keel unit is folded from a <strong>3:1 rectangle</strong> — cut a square or A-series sheet into three strips.</p>
      <p>It's an open-frame edge unit in the tradition of Robert Neale's Penultimate module and Tom Hull's PHiZZ: one unit per polyhedron edge, with the faces left open.</p>
    `,
    sliderEnabled: false,
    stepFunc: "paper",
  },
  {
    title: "Step 1: Center Crease",
    description: `
      <p>Fold the strip in half lengthwise to crease the center line, then open it back up.</p>
    `,
    sliderEnabled: true,
    stepFunc: "crease",
  },
  {
    title: "Step 2: Sleeve Fold",
    description: `
      <p>Fold both long edges in to meet the center crease.</p>
      <p>The two flaps form the <strong>sleeve</strong>: the slit between them runs the length of the strip, with a pocket under each flap. Neighboring units' tabs will slide in here.</p>
    `,
    sliderEnabled: true,
    stepFunc: "sleeve",
  },
  {
    title: "Step 3: Miter the Ends",
    description: `
      <p>Fold each end back along a diagonal crease through its bottom corner. These wedges are the <strong>tabs</strong>.</p>
      <p>The crease angle decides what the unit builds: <strong>54°</strong> for pentagons (shown here), 45° for squares, 30° for triangles.</p>
    `,
    sliderEnabled: true,
    stepFunc: "miter",
  },
  {
    title: "Step 4: The Keel Fold",
    description: `
      <p>Fold the whole strip in half lengthwise, away from you.</p>
      <p>The mountain ridge — the <strong>keel</strong> — becomes the outer crest of the strut.</p>
    `,
    sliderEnabled: true,
    stepFunc: "keel",
  },
  {
    title: "Completed Unit",
    description: `
      <p>The finished Keel unit: a V-section strut with the sleeve slit along one side and a mitered tab at each end.</p>
      <p>To join units, slide a tab into the next unit's sleeve pocket. The miter angle makes the corner close at exactly the right angle.</p>
    `,
    sliderEnabled: false,
    foldPercent: 1,
    stepFunc: "keel",
  },

  // --- Assembly steps (open frames) ---
  {
    title: "Assembly: One Pentagon",
    description: `
      <p>Five units, tab into sleeve, close into a single <strong>pentagon frame</strong>. The 54° miters make the corners meet exactly.</p>
      <p>This ring is the working module of everything that follows.</p>
    `,
    renderer: "assembly",
    model: "pentagon",
  },
  {
    title: "Assembly: Tetrahedron",
    description: `
      <p><strong>6 units</strong> (30° miter variant) frame a tetrahedron — the smallest closed lattice.</p>
    `,
    renderer: "assembly",
    model: "tetrahedron",
  },
  {
    title: "Assembly: Cube",
    description: `
      <p><strong>12 units</strong> (45° miter variant) frame a cube. Each vertex collects three struts.</p>
    `,
    renderer: "assembly",
    model: "cube",
  },
  {
    title: "Assembly: Octahedron",
    description: `
      <p><strong>12 units</strong> (30° miter variant) frame an octahedron — four struts meet at every vertex.</p>
    `,
    renderer: "assembly",
    model: "octahedron",
  },
  {
    title: "Assembly: Dodecahedron",
    description: `
      <p>The showpiece: <strong>30 units</strong> with the 54° miter frame a dodecahedron — twelve open pentagons.</p>
    `,
    renderer: "assembly",
    model: "dodecahedron",
  },
  {
    title: "Assembly: Icosahedron",
    description: `
      <p><strong>30 units</strong> (30° miter variant) frame an icosahedron: twenty open triangles, five struts at every vertex.</p>
      <p>Rotate the lattice and look through it — that's the charm of open-frame modulars.</p>
    `,
    renderer: "assembly",
    model: "icosahedron",
  },
];
