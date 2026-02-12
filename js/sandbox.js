import { SandboxView } from './sandbox-view.js';

document.addEventListener('DOMContentLoaded', () => {
  const sandbox = new SandboxView();
  const container = document.getElementById('container');
  
  sandbox.init(container);

  // Bind UI
  document.getElementById('add-unit').addEventListener('click', () => {
    sandbox.addUnit();
  });

  // Start with one unit
  sandbox.addUnit();
});
