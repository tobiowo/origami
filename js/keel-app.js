import { steps as keelSteps } from './keel-steps.js';
import { FoldModelView } from './fold-model-view.js';
import { computeKeelGeometry } from './keel-fold-model.js';
import { KeelAssemblyView } from './keel-assembly.js';

class KeelApp {
  constructor() {
    window.keelApp = this;
    this.steps = keelSteps;
    this.currentStep = 0;
    this.foldingView = new FoldModelView(computeKeelGeometry, { backColor: 0x1abc9c, elevation: 0.6 });
    this.assemblyView = new KeelAssemblyView();

    this.els = {
      stepCounter: document.getElementById('step-counter'),
      stepTitle: document.getElementById('step-title'),
      stepDescription: document.getElementById('step-description'),
      btnPrev: document.getElementById('btn-prev'),
      btnNext: document.getElementById('btn-next'),
      slider: document.getElementById('fold-slider'),
      sliderGroup: document.getElementById('fold-slider-group'),
      checkCinematic: document.getElementById('check-cinematic'),
      simulatorContainer: document.getElementById('simulator-container'),
      assemblyContainer: document.getElementById('assembly-container'),
      loadingOverlay: document.getElementById('loading-overlay'),
    };
  }

  start() {
    this.foldingView.init(this.els.simulatorContainer);
    this.assemblyView.init(this.els.assemblyContainer);

    this.els.loadingOverlay.classList.add('hidden');
    setTimeout(() => {
      if (this.els.loadingOverlay.parentNode) {
        this.els.loadingOverlay.parentNode.removeChild(this.els.loadingOverlay);
      }
    }, 500);

    this._renderStep();
    this._bindEvents();
  }

  _bindEvents() {
    this.els.btnPrev.addEventListener('click', () => this.prevStep());
    this.els.btnNext.addEventListener('click', () => this.nextStep());

    this.els.slider.addEventListener('input', (e) => {
      this.foldingView.setProgress(parseFloat(e.target.value) / 100);
    });

    this.els.checkCinematic.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      this.foldingView.setCinematicMode(enabled);
      this.assemblyView.setCinematicMode(enabled);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prevStep();
      if (e.key === 'ArrowRight') this.nextStep();
    });
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this._renderStep();
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
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

    if (step.renderer === 'assembly') {
      this.foldingView.hide();
      this.assemblyView.show();
      this.els.sliderGroup.style.display = 'none';
      this.assemblyView.renderModel(step.model);
      return;
    }

    this.foldingView.show();
    this.assemblyView.hide();
    this.els.sliderGroup.style.display = step.sliderEnabled ? 'block' : 'none';

    const progress = step.foldPercent !== undefined ? step.foldPercent : 0;
    this.els.slider.value = progress * 100;
    this.foldingView.setStep(step.stepFunc || 'paper', progress);
    if (progress > 0) this.foldingView.setProgress(progress);
  }
}

function init() {
  const app = new KeelApp();
  window.app = app;
  app.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
