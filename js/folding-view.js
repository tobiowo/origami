export class FoldingView {
  constructor() {
    this.simulator = null;
    this.container = null;
    this.currentStepFunc = null;
  }

  init(container) {
    this.container = container;
    this.simulator = OrigamiSimulator({
      parent: container,
      simulationRunning: true,
      backgroundColor: "0d0d1a",
      color1: "4488cc",
      color2: "336699",
      edgesVisible: true,
      mtnsVisible: true,
      valleysVisible: true,
      boundaryEdgesVisible: true,
      passiveEdgesVisible: false,
      panelsVisible: false,
    });
    window.simulator = this.simulator;

    setTimeout(() => {
      if (this.simulator && this.simulator.threeView) {
        this.simulator.threeView.onWindowResize();
      }
    }, 100);
  }

  show() {
    if (this.container) {
      this.container.style.display = "block";
      setTimeout(() => {
        if (this.simulator && this.simulator.threeView) {
          this.simulator.threeView.onWindowResize();
        }
      }, 50);
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }

  loadPattern(foldObj) {
    if (!this.simulator) return;
    this.simulator.loadFOLD(JSON.parse(JSON.stringify(foldObj)));
  }

  /**
   * Load the fold pattern for a specific step, then set foldPercent.
   * Each step has its own set of active creases/angles.
   */
  updateStepState(stepFunc, percent) {
    if (!this.simulator) return;

    if (this.currentStepFunc !== stepFunc) {
      this.currentStepFunc = stepFunc;
      import('./sonobe.js').then(m => {
        // Load the pattern with full target angles (percent = 1)
        // The simulator will interpolate based on foldPercent
        const fold = m.getSonobeForStep(stepFunc, 1);
        this.loadPattern(fold);
        this.setFoldPercent(percent);
      });
    } else {
      this.setFoldPercent(percent);
    }
  }

  setFoldPercent(percent) {
    if (!this.simulator) return;
    this.simulator.foldPercent = Math.max(0, Math.min(1, percent));
  }

  getFoldPercent() {
    if (!this.simulator) return 0;
    return this.simulator.foldPercent;
  }
}
