export class FoldingView {
  constructor() {
    this.simulator = null;
    this.container = null;
    this.currentStepFunc = null;
    this.autoRotate = false;
    this.dynamicLight = null;
    this.animationId = null;
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

    // Add cinematic light
    const three = this.simulator.threeView;
    if (three) {
      this.dynamicLight = new THREE.PointLight(0xffffff, 0.8, 10);
      three.scene.add(this.dynamicLight);
    }

    setTimeout(() => {
      if (this.simulator && this.simulator.threeView) {
        this.simulator.threeView.onWindowResize();
      }
    }, 100);

    this._animate();
  }

  setCinematicMode(enabled) {
    this.autoRotate = enabled;
    if (!enabled && this.simulator && this.simulator.threeView && this.simulator.threeView.modelWrapper) {
      // Reset rotation of the entire model wrapper
      this.simulator.threeView.modelWrapper.rotation.set(0, 0, 0);
    }
  }

  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());
    
    const time = performance.now() * 0.001;

    // Rotate model wrapper (contains meshes and lines)
    if (this.autoRotate && this.simulator && this.simulator.threeView && this.simulator.threeView.modelWrapper) {
      this.simulator.threeView.modelWrapper.rotation.y += 0.005;
    }

    // Orbit light
    if (this.dynamicLight && this.simulator && this.simulator.threeView) {
      this.dynamicLight.position.x = Math.sin(time * 0.8) * 3;
      this.dynamicLight.position.z = Math.cos(time * 0.8) * 3;
      this.dynamicLight.position.y = Math.sin(time * 0.6) * 1.5 + 1.5;
    }
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
