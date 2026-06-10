/**
 * Renderer for the Golden Venture folding tutorial.
 *
 * Draws the kinematic fold model from gv-fold-model.js: each paper region is
 * a convex polygon rendered with a two-tone material (paper front / colored
 * back, resolved by winding so reflections flip color automatically) plus a
 * dark outline. Rebuilding the small mesh set every slider tick is cheap.
 */

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { computeGVGeometry, getGVStepModel } from './gv-fold-model.js';

const PAPER_FRONT = 0xe9e2d2; // cream paper
const PAPER_BACK = 0x4488cc;  // app accent blue
const OUTLINE = 0x20242e;
const CREASE = 0x8a8475;

// Center of the working area (paper is 1.5 x 1, strip lives in y [0.5, 1]).
const CENTER = { x: 0.75, y: 0.75 };

export class GVFoldingView {
  constructor() {
    this.container = null;
    this.stepId = 'paper';
    this.progress = 0;
    this.autoRotate = false;
    this.flipAngle = 0;
  }

  init(container) {
    this.container = container;
    const rect = container.getBoundingClientRect();
    const w = rect.width || 640;
    const h = rect.height || 480;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d1a);

    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.01, 50);
    this.camera.position.set(0, -1.2, 2.4);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = 8;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45 * Math.PI));
    const key = new THREE.DirectionalLight(0xffffff, 0.55 * Math.PI);
    key.position.set(1.5, 1, 3);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd4ff, 0.3 * Math.PI);
    fill.position.set(-2, -1, -2.5);
    this.scene.add(fill);

    // paperGroup carries the flip rotation; its child holds the meshes
    // recentered on the working area.
    this.paperGroup = new THREE.Group();
    this.meshGroup = new THREE.Group();
    this.meshGroup.position.set(-CENTER.x, -CENTER.y, 0);
    this.paperGroup.add(this.meshGroup);
    this.scene.add(this.paperGroup);

    this.frontMat = new THREE.MeshStandardMaterial({
      color: PAPER_FRONT, side: THREE.FrontSide, roughness: 0.85, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
    this.backMat = new THREE.MeshStandardMaterial({
      color: PAPER_BACK, side: THREE.BackSide, roughness: 0.85, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
    this.outlineMat = new THREE.LineBasicMaterial({ color: OUTLINE });
    this.creaseMat = new THREE.LineBasicMaterial({ color: CREASE });

    this._rebuild();

    window.addEventListener('resize', () => this._onResize());
    this._animate();
  }

  setStep(stepId, progress = 0) {
    this.stepId = stepId;
    this.progress = progress;
    this.flipAngle = 0;
    this.paperGroup.rotation.set(0, 0, 0);

    // Center the view on the step's finished state so the model stays put
    // while the slider animates.
    const end = computeGVGeometry(stepId, 1);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const f of end.faces) {
      for (const [x, y] of f.pts) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    this.meshGroup.position.set(-(minX + maxX) / 2, -(minY + maxY) / 2, 0);

    this._rebuild();
  }

  setProgress(t) {
    this.progress = t;
    const model = getGVStepModel(this.stepId);
    if (model.flip) {
      // Step 4 just turns the piece around.
      this.flipAngle = Math.PI * t;
      this.paperGroup.rotation.y = this.flipAngle;
      return;
    }
    this._rebuild();
  }

  setCinematicMode(enabled) {
    this.autoRotate = enabled;
    if (!enabled) this.paperGroup.rotation.y = this.flipAngle;
  }

  _rebuild() {
    // Dispose previous meshes
    for (const child of [...this.meshGroup.children]) {
      this.meshGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    const { faces, creases } = computeGVGeometry(this.stepId, this.progress);

    for (const face of faces) {
      const geo = this._polyGeometry(face.pts);
      this.meshGroup.add(new THREE.Mesh(geo, this.frontMat));
      this.meshGroup.add(new THREE.Mesh(geo, this.backMat));
      this.meshGroup.add(new THREE.LineLoop(this._outlineGeometry(face.pts), this.outlineMat));
    }

    for (const c of creases) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...c.a), new THREE.Vector3(...c.b),
      ]);
      this.meshGroup.add(new THREE.Line(geo, this.creaseMat));
    }
  }

  _polyGeometry(pts) {
    // Convex polygon -> triangle fan
    const verts = [];
    for (let i = 1; i < pts.length - 1; i++) {
      verts.push(...pts[0], ...pts[i], ...pts[i + 1]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    geo.computeVertexNormals();
    return geo;
  }

  _outlineGeometry(pts) {
    return new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
  }

  _onResize() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (this.autoRotate) this.paperGroup.rotation.y += 0.004;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  show() {
    if (this.container) this.container.style.display = 'block';
    this._onResize();
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }
}
