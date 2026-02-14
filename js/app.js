import { steps as staticSteps } from './steps.js';
import { FoldingView } from './folding-view.js';
import { AssemblyView } from './assembly-view-v2.js';
import { createSonobeFOLD } from './sonobe.js';
import { createSonobeAnimationSequence } from './sonobe-animation.js';

class App {
  constructor() {
    this.foldingSteps = staticSteps.slice(0, 7); // First 7 steps are folding/overview
    this.currentStep = 0;
    this.steps = [];
    this.animationSequence = null;
    this.isAnimating = false;

    this.foldingView = new FoldingView();
    this.assemblyView = new AssemblyView();

    this.els = {
      stepCounter: document.getElementById('step-counter'),
      stepTitle: document.getElementById('step-title'),
      stepDescription: document.getElementById('step-description'),
      btnPrev: document.getElementById('btn-prev'),
      btnNext: document.getElementById('btn-next'),
      slider: document.getElementById('fold-slider'),
      sliderGroup: document.getElementById('fold-slider-group'),
      modelSelector: document.getElementById('model-selector'),
      modelSelectorGroup: document.getElementById('model-selector-group'),
      checkCinematic: document.getElementById('check-cinematic'),
      btnExplode: document.getElementById('btn-explode'),
      explodeGroup: document.getElementById('explode-group'),
      simulatorContainer: document.getElementById('simulator-container'),
      assemblyContainer: document.getElementById('assembly-container'),
      loadingOverlay: document.getElementById('loading-overlay'),
    };
  }

  start() {
    this.foldingView.init(this.els.simulatorContainer);
    this.assemblyView.init(this.els.assemblyContainer);

    // Sync initial model type from dropdown
    const initialType = this.els.modelSelector.value;
    this.assemblyView.setModelType(parseInt(initialType));

    this._refreshSteps();

    setTimeout(() => {
      // Load flat crease pattern for step 1 view
      this.foldingView.loadPattern(createSonobeFOLD());
      this.foldingView.setFoldPercent(0);
      this.els.loadingOverlay.classList.add('hidden');
      this._renderStep();
    }, 1500);

    this._bindEvents();
  }

  _refreshSteps() {
    const assemblySteps = [];
    const n = this.assemblyView.modelType;
    
    // Add assembly steps
    for (let i = 1; i <= n; i++) {
      const isLast = (i === n);
      assemblySteps.push({
        title: isLast ? `Complete ${n}-Unit Model!` : `Add Unit ${i}`,
        description: isLast 
          ? `<p>Congratulations! You've assembled the <strong>${n}-unit model</strong>. All units are now interlocked!</p><p>Rotate the view to admire the geometry.</p>`
          : `<p>Add the <strong>unit #${i}</strong> to the assembly.</p><p>Notice how the tabs tuck into the pockets of neighboring units.</p>`,
        renderer: "assembly",
        unitCount: i,
      });
    }

    this.steps = [...this.foldingSteps, ...assemblySteps];
  }

  _bindEvents() {
    this.els.btnPrev.addEventListener('click', () => this.prevStep());
    this.els.btnNext.addEventListener('click', () => this.nextStep());

    this.els.slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      const step = this.steps[this.currentStep];

      if (step.stepFunc) {
        this.foldingView.updateStepState(step.stepFunc, val);
      } else {
        this.foldingView.setFoldPercent(val);
      }
    });

    this.els.modelSelector.addEventListener('change', async (e) => {
      const type = e.target.value;
      if (type === 'custom') {
        await this.assemblyView.loadCustomOBJ('./references/beetle.obj');
      } else {
        this.assemblyView.setModelType(parseInt(type));
      }
      this._refreshSteps();
      // If we are already in assembly mode, stay at the first assembly step
      if (this.currentStep >= 7) {
        this.currentStep = 7;
      }
      this._renderStep();
    });

    this.els.checkCinematic.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      this.foldingView.setCinematicMode(enabled);
      this.assemblyView.setCinematicMode(enabled);
    });

    this.els.btnExplode.addEventListener('click', () => {
      const exploding = this.assemblyView.toggleExplode();
      this.els.btnExplode.textContent = exploding ? 'Collapse View' : 'Explode View';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prevStep();
      if (e.key === 'ArrowRight') this.nextStep();
    });
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1 && !this.isAnimating) {
      this.currentStep++;
      this._renderStep();
    }
  }

  prevStep() {
    if (this.currentStep > 0 && !this.isAnimating) {
      this.currentStep--;
      this._renderStep();
    }
  }

  _renderStep() {
    const step = this.steps[this.currentStep];
    this.els.stepCounter.textContent = `STEP ${this.currentStep + 1} OF ${this.steps.length}`;
    this.els.stepTitle.textContent = step.title;
    this.els.stepDescription.innerHTML = step.description;
    this.els.btnPrev.disabled = this.currentStep === 0;
    this.els.btnNext.disabled = this.currentStep === this.steps.length - 1;
    this.els.btnNext.textContent = this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next';

    // Show model selector only for assembly steps (Step 8+)
    this.els.modelSelectorGroup.style.display = this.currentStep >= 7 ? 'block' : 'none';

    if (step.renderer === 'animation') {
      this._showAnimation(step);
    } else if (step.renderer === 'simulator') {
      this._showSimulator(step);
    } else {
      this._showAssembly(step);
    }
  }

  async _showAnimation(step) {
    this.foldingView.show();
    this.assemblyView.hide();
    this.els.sliderGroup.style.display = 'none';
    this.els.explodeGroup.style.display = 'none';

    if (!this.animationSequence) {
      this.animationSequence = createSonobeAnimationSequence(window.ear);
    }

    // Load first frame initially
    this.foldingView.loadPattern(this.animationSequence[0]);
    this.foldingView.setFoldPercent(0);

    const playBtn = document.getElementById('btn-play-animation');
    if (playBtn) {
      playBtn.onclick = () => this.playFullAnimation();
    }
  }

  async playFullAnimation() {
    if (this.isAnimating || !this.animationSequence) return;
    this.isAnimating = true;
    
    const playBtn = document.getElementById('btn-play-animation');
    if (playBtn) playBtn.disabled = true;
    this.els.btnPrev.disabled = true;
    this.els.btnNext.disabled = true;

    const simulator = this.foldingView.simulator;
    
    for (let i = 0; i < this.animationSequence.length; i++) {
      const fold = this.animationSequence[i];
      const desc = document.getElementById('step-description');
      if (desc) {
        // Simple feedback
        const info = document.createElement('p');
        info.style.color = '#e94560';
        info.style.fontWeight = 'bold';
        info.textContent = `Playing: ${fold.frame_title}...`;
        desc.appendChild(info);
      }

      simulator.loadFOLD(JSON.parse(JSON.stringify(fold)));
      
      for (let p = 0; p <= 100; p += 4) {
        simulator.foldPercent = p / 100;
        await new Promise(r => requestAnimationFrame(r));
      }
      await new Promise(r => setTimeout(r, 600));
      
      // Clear the playing label
      if (desc && desc.lastChild.tagName === 'P') desc.removeChild(desc.lastChild);
    }

    this.isAnimating = false;
    if (playBtn) playBtn.disabled = false;
    this.els.btnPrev.disabled = this.currentStep === 0;
    this.els.btnNext.disabled = false;
  }

  _showSimulator(step) {
    this.foldingView.show();
    this.assemblyView.hide();
    this.els.explodeGroup.style.display = 'none';

    if (step.sliderEnabled) {
      this.els.sliderGroup.style.display = 'block';
      // Reset slider to 0 when entering a new step
      this.els.slider.value = 0;
      if (step.stepFunc) {
        this.foldingView.updateStepState(step.stepFunc, 0);
      } else {
        this.foldingView.loadPattern(createSonobeFOLD());
        this.foldingView.setFoldPercent(0);
      }
    } else {
      this.els.sliderGroup.style.display = 'none';
      if (step.foldPercent !== null && step.foldPercent !== undefined) {
        if (step.stepFunc) {
          this.foldingView.updateStepState(step.stepFunc, step.foldPercent);
        } else {
          this.foldingView.loadPattern(createSonobeFOLD());
          this.foldingView.setFoldPercent(step.foldPercent);
        }
      }
    }
  }

  _showAssembly(step) {
    this.foldingView.hide();
    this.els.sliderGroup.style.display = 'none';
    this.els.explodeGroup.style.display = 'block';
    this.els.btnExplode.textContent = this.assemblyView.explodeTarget === 1 ? 'Collapse View' : 'Explode View';
    this.assemblyView.show();
    this.assemblyView.setUnitCount(step.unitCount);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
