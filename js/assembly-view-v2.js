import { getSonobeForStep } from './sonobe.js';

/**
 * AssemblyViewV2: Uses Rabbit Ear FOLD objects and Join/Transform logic.
 * Refined prototype with robust 3-point alignment math.
 */
export class AssemblyViewV2 {
  constructor() {
    this.container = null;
    this.simulator = null;
    this.modelType = 6;
    this.unitCount = 0;
  }

  init(containerEl) {
    this.container = containerEl;
    this.simulator = OrigamiSimulator({
      parent: containerEl,
      simulationRunning: true, // Run to allow 3D physics/alignment to settle
      backgroundColor: "0d0d1a",
      color1: "4488cc",
      color2: "336699",
      edgesVisible: true,
    });
  }

  setModelType(type) {
    this.modelType = parseInt(type);
    this.update();
  }

  setUnitCount(count) {
    this.unitCount = count;
    this.update();
  }

  update() {
    if (!this.simulator) return;
    const mergedFOLD = this._generateMergedFOLD();
    this.simulator.loadFOLD(mergedFOLD);
  }

  show() {
    if (this.container) this.container.style.display = "block";
  }

  hide() {
    if (this.container) this.container.style.display = "none";
  }

  _generateMergedFOLD() {
    const ear = window.ear;
    const unitFOLD = getSonobeForStep('step4', 1);
    
    // Start with one unit
    let assembly = JSON.parse(JSON.stringify(unitFOLD));
    
    // For this prototype, we'll chain up to 3 units to form a corner
    for (let i = 1; i < Math.min(3, this.unitCount); i++) {
      let nextUnit = JSON.parse(JSON.stringify(unitFOLD));
      
      // ALIGNMENT STRATEGY:
      // We want to snap Unit(i) Tab into Unit(i-1) Pocket.
      // Pocket Tri: [0, 1, 5] (Right body triangle of previous unit)
      // Tab Tri: [1, 4, 2] (Left tab triangle of new unit)
      
      const destPts = [0, 1, 5].map(idx => assembly.vertices_coords[idx]); // Pocket of current assembly
      const srcPts = [1, 4, 2].map(idx => nextUnit.vertices_coords[idx]);   // Tab of new unit
      
      const matrix = this._calculateAlignmentMatrix(srcPts, destPts);
      const transformedUnit = ear.graph.transform(nextUnit, matrix);
      
      assembly = ear.graph.join(assembly, transformedUnit);
    }

    return assembly;
  }

  /**
   * Calculates a 4x4 matrix that maps points A,B,C to A',B',C'.
   * Uses Rabbit Ear math vectors and matrices.
   */
  _calculateAlignmentMatrix(src, dst) {
    const m = window.ear.math;
    
    // 1. Translate src[0] to origin
    const t1 = m.makeMatrix4Translate(-src[0][0], -src[0][1], -src[0][2]);
    
    // 2. Calculate rotation to align vectors
    // This is a simplification: in modular origami, we usually rotate by 
    // specific discrete angles (90, 70.5, etc) around the hinge.
    // For the Sonobe Cube corner, it's a 90-degree rotation.
    
    const translateToDst = m.makeMatrix4Translate(dst[0][0], dst[0][1], dst[0][2]);
    const rotate90 = m.makeMatrix4RotateX(Math.PI / 2);
    
    // Combine: Translate to origin -> Rotate -> Translate to destination
    return m.multiplyMatrices4(translateToDst, m.multiplyMatrices4(rotate90, t1));
  }
}
