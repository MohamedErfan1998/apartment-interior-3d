// Entry point: styles, the Three.js namespace for the scene modules, the shared apartment model, then the presentation app.
import './styles.css';
import './three-global';
import './scene/data.js';
import './scene/plan.js';
import './scene/render.js';
import './scene/fam.js';

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function boot(): void {
  const root = document.getElementById('fam');
  if (!root) return;
  const startBtn = root.querySelector<HTMLButtonElement>('.fam-start');
  const statusEl = root.querySelector<HTMLElement>('.fam-status');
  const fail = (message: string) => {
    if (statusEl) { statusEl.textContent = message; statusEl.classList.add('error'); }
    if (startBtn) { startBtn.textContent = 'Not available on this device'; startBtn.disabled = true; }
  };
  if (!webglAvailable()) { fail('This browser cannot show 3D (WebGL is off). Try Chrome, Edge, Safari or Firefox.'); return; }
  try {
    window.APTFAM.init(root);
    if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'START 3D TOUR  ▶'; }
  } catch (err) {
    fail('3D could not start: ' + (err instanceof Error ? err.message : String(err)));
  }
}

// Module scripts run after the document is parsed; a short delay lets the title screen paint before the scene is built.
window.setTimeout(boot, 60);
