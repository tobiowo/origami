import { steps as gvSteps } from './gv-steps.js';
import { GVFoldingView } from './gv-folding-view.js';
import { GVAssemblyView } from './gv-assembly.js';
import { parseGVLayout } from './gv-importer.js';

class GVApp {
  constructor() {
    window.gvApp = this;
    this.steps = gvSteps;
    this.currentStep = 0;
    this.foldingView = new GVFoldingView();
    this.assemblyView = new GVAssemblyView();

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
      importText: document.getElementById('import-text'),
      btnImport: document.getElementById('btn-import'),
      btnClear: document.getElementById('btn-clear'),
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

    this.els.btnImport.addEventListener('click', () => {
      const encoded = this.els.importText.value.trim();
      if (!encoded) return;

      const model = parseGVLayout(encoded);
      if (model) {
        this.foldingView.hide();
        this.assemblyView.show();
        this.els.sliderGroup.style.display = 'none';
        this.assemblyView.renderModel(model);

        // Update UI to show we are in a custom view
        this.els.stepCounter.textContent = "CUSTOM LAYOUT";
        this.els.stepTitle.textContent = model.parts[0].name || "Imported Model";
        this.els.stepDescription.innerHTML = `<p>Successfully imported model with ${model.parts.length} part(s).</p>`;
      } else {
        alert("Failed to parse layout. Please check the Base64 string.");
      }
    });

    this.els.btnClear.addEventListener('click', () => {
      this.assemblyView.clear();
      this.els.stepCounter.textContent = "VIEW CLEARED";
      this.els.stepTitle.textContent = "Empty Workspace";
      this.els.stepDescription.innerHTML = "<p>The 3D view has been cleared. Navigate back to see the tutorial steps or import a new layout.</p>";
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

      this.assemblyView.clear();
      if (step.layout) {
        const model = parseGVLayout(step.layout);
        if (model) {
          this.assemblyView.renderModel(model);
        } else {
          console.error(
            `Built-in tutorial layout for step ${this.currentStep} failed to parse.`,
          );
        }
      } else {
        const model = {
          parts: [{
            name: "Tutorial Ring",
            rows: Array.from({ length: step.rows }, (_, r) => ({
              alignment: 'offset',
              pieces: [{
                type: 'A',
                color: (r % 2 === 0) ? '#4488cc' : '#e94560',
                count: step.ringCount
              }]
            }))
          }]
        };
        this.assemblyView.renderModel(model);
      }
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
  const app = new GVApp();
  window.app = app;
  app.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
