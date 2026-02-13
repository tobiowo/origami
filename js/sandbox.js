import { SandboxView, UNIT_COLORS } from './sandbox-view.js';

document.addEventListener('DOMContentLoaded', () => {
  const sandbox = new SandboxView();
  const container = document.getElementById('container');

  sandbox.init(container);

  // ── UI Elements ──
  const els = {
    addUnit: document.getElementById('add-unit'),
    undoBtn: document.getElementById('btn-undo'),
    clearBtn: document.getElementById('btn-clear'),
    unitCounter: document.getElementById('unit-counter'),
    colorSwatches: document.getElementById('color-swatches'),
    modeIndicator: document.getElementById('mode-indicator'),
    statusBar: document.getElementById('status-bar'),
  };

  // ── Color Swatches ──
  const swatchColors = UNIT_COLORS.slice(0, 12);
  let activeSwatchIdx = 0;

  swatchColors.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (i === 0 ? ' active' : '');
    swatch.style.background = '#' + color.toString(16).padStart(6, '0');
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      activeSwatchIdx = i;
      sandbox.setColor(swatchColors[i]);
    });
    els.colorSwatches.appendChild(swatch);
  });

  // ── Callbacks ──
  sandbox.onUnitCountChange = (count) => {
    els.unitCounter.textContent = `${count} unit${count !== 1 ? 's' : ''}`;
    els.undoBtn.disabled = count === 0;
    els.clearBtn.disabled = count === 0;
  };

  sandbox.onModeChange = (mode) => {
    els.modeIndicator.textContent = mode;
  };

  sandbox.onStatusChange = (msg) => {
    els.statusBar.textContent = msg;
  };

  // ── Button Handlers ──
  els.addUnit.addEventListener('click', () => {
    sandbox.addUnit();
  });

  els.undoBtn.addEventListener('click', () => {
    sandbox.undo();
  });

  els.clearBtn.addEventListener('click', () => {
    sandbox.clearAll();
  });

  // ── Preset Buttons ──
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = parseInt(btn.dataset.preset);
      sandbox.loadPreset(type);
    });
  });

  // Start with one unit
  sandbox.addUnit();
});
