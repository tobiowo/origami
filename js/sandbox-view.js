/**
 * Three.js Sandbox for interactive Sonobe unit assembly.
 * Features: real V-shaped unit geometry, snap-to-connect, model presets, selection highlights.
 */
import { AssemblyView } from './assembly-view.js';

const UNIT_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c,
  0xd35400, 0x27ae60, 0x2980b9, 0x8e44ad, 0xc0392b, 0x16a085,
  0xe67e22, 0x3498db, 0xe91e63, 0x00bcd4, 0x8bc34a, 0xff9800,
  0x673ab7, 0x009688, 0xf44336, 0x03a9f4, 0xcddc39, 0xff5722,
  0x9c27b0, 0x4caf50, 0x2196f3, 0xffeb3b, 0x795548, 0x607d8b,
];

export class SandboxView {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.transformControls = null;
    this.units = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedUnit = null;
    this.animationId = null;
    this.selectedColor = UNIT_COLORS[0];
    this.undoStack = [];

    // Snap system
    this.snapThreshold = 0.8;
    this.proximityThreshold = 1.2; // outer range for "getting close" feedback
    this.snapHelpers = [];  // visual pocket indicators
    this.isDragging = false;
    this.proximityLine = null;
    this.highlightedHelper = null;

    // Callbacks
    this.onUnitCountChange = null;
    this.onModeChange = null;
    this.onStatusChange = null;
  }

  init(containerEl) {
    this.container = containerEl;
    const rect = containerEl.getBoundingClientRect();
    const w = rect.width || 640;
    const h = rect.height || 480;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d1a);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    this.camera.position.set(4, 3.5, 4);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    containerEl.appendChild(this.renderer.domElement);

    // Trackball Controls (View)
    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 2.0;
    this.controls.zoomSpeed = 1.2;
    this.controls.staticMoving = true;

    // Transform Controls (Move/Rotate)
    this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value;
      this.isDragging = event.value;
      if (!event.value && this.selectedUnit) {
        // User released — try snap
        this._trySnap(this.selectedUnit);
      }
      // Show/hide snap helpers
      if (event.value) {
        this._showSnapHelpers(this.selectedUnit);
      } else {
        this._hideSnapHelpers();
      }
    });
    this.scene.add(this.transformControls);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x404060, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x4488cc, 0.3);
    fillLight.position.set(-3, 2, -5);
    this.scene.add(fillLight);

    // Grid helper
    const grid = new THREE.GridHelper(10, 20, 0x333344, 0x1a1a2e);
    grid.material.transparent = true;
    grid.material.opacity = 0.5;
    this.scene.add(grid);

    // Events (store refs for cleanup)
    this._onResizeBound = () => this._onResize();
    this._onKeyDownBound = (e) => this._onKeyDown(e);
    window.addEventListener('resize', this._onResizeBound);
    this.renderer.domElement.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    window.addEventListener('keydown', this._onKeyDownBound);

    this._animate();
  }

  // ── Public API ──

  setColor(color) {
    this.selectedColor = color;
  }

  addUnit(color) {
    const c = color || this.selectedColor;
    const unit = this._createCanonicalUnit(c);

    // Position slightly above grid, randomly offset
    unit.position.set(
      (Math.random() - 0.5) * 2,
      0.6,
      (Math.random() - 0.5) * 2
    );

    this.scene.add(unit);
    this.units.push(unit);
    this.undoStack.push({ type: 'add', unit });
    this.selectUnit(unit);
    this._updateCounter();
    return unit;
  }

  addUnitAt(def, color) {
    // Add a unit with pre-computed geometry (from preset)
    const unit = this._createUnitFromDef(def, color);
    this.scene.add(unit);
    this.units.push(unit);
    this._updateCounter();
    return unit;
  }

  selectUnit(unit) {
    // Deselect previous
    if (this.selectedUnit) {
      this._setHighlight(this.selectedUnit, false);
    }

    this.selectedUnit = unit;

    if (unit) {
      this.transformControls.attach(unit);
      this._setHighlight(unit, true);
      this._setStatus('Selected. Drag gizmo to move. Press R to rotate.');
    } else {
      this.transformControls.detach();
      this._setStatus('Click a unit to select it. Scroll to zoom.');
    }
  }

  removeSelected() {
    if (this.selectedUnit) {
      const unit = this.selectedUnit;
      this.scene.remove(unit);
      this.units = this.units.filter(u => u !== unit);
      this.transformControls.detach();
      this.selectedUnit = null;
      this._updateCounter();
      this._setStatus('Unit removed.');
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const action = this.undoStack.pop();
    if (action.type === 'add') {
      if (this.selectedUnit === action.unit) {
        this.transformControls.detach();
        this.selectedUnit = null;
      }
      this.scene.remove(action.unit);
      this.units = this.units.filter(u => u !== action.unit);
      this._updateCounter();
    }
  }

  clearAll() {
    this.transformControls.detach();
    this.selectedUnit = null;
    this.units.forEach(u => this.scene.remove(u));
    this.units = [];
    this.undoStack = [];
    this._updateCounter();
    this._setStatus('Scene cleared.');
  }

  loadPreset(modelType) {
    this.clearAll();

    // Use a temporary AssemblyView to generate unit definitions
    const tempAssembly = new AssemblyView();
    tempAssembly.modelType = parseInt(modelType);

    // Call the generator directly (it's a private method but we access it)
    const defs = tempAssembly._getUnitDefs();

    defs.forEach((def, i) => {
      const color = UNIT_COLORS[i % UNIT_COLORS.length];
      this.addUnitAt(def, color);
    });

    // Reset camera for model size
    const dist = modelType <= 6 ? 5 : modelType <= 30 ? 7 : 10;
    this.camera.position.set(dist * 0.7, dist * 0.6, dist * 0.7);
    this.camera.lookAt(0, 0, 0);

    this._setStatus(`Loaded ${modelType}-unit preset. Click any unit to move it.`);
  }

  getUnitCount() {
    return this.units.length;
  }

  // ── Geometry Creation ──

  _createCanonicalUnit(color) {
    // A canonical Sonobe unit centered at origin with ridge along X-axis.
    // V-shaped body (two triangles meeting at ridge) + two tab triangles.
    const L = 1.4;  // edge length
    const halfL = L / 2;
    const h = L / (2 * Math.sqrt(2));  // apex height for 90° angle

    // Ridge endpoints
    const A = [-halfL, 0, 0];
    const B = [halfL, 0, 0];

    // Apex points: body forms a V-shape opening downward
    const apex1 = [0, h, -h];   // front face apex
    const apex2 = [0, h, h];    // back face apex

    // Small ridge offset upward
    const ridge = 0.05;
    const A_r = [-halfL, ridge, 0];
    const B_r = [halfL, ridge, 0];

    // Body triangles
    const b1 = [A_r, B_r, apex1];
    const b2 = [A_r, B_r, apex2];

    // Tab triangles: fold inward from the apex
    const tabLeg = halfL;
    // Tab at A end: extends from body face 1 side
    const tipA = [-halfL - tabLeg * 0.5, h * 0.3, -h * 0.6];
    const tipB = [halfL + tabLeg * 0.5, h * 0.3, h * 0.6];

    const t1 = [A_r, apex1, tipA];
    const t2 = [B_r, apex2, tipB];

    const def = { b1, b2, t1, t2 };
    return this._createUnitFromDef(def, color);
  }

  _createUnitFromDef(def, color) {
    const group = new THREE.Group();
    group.userData.sonobeColor = color;

    const mat = new THREE.MeshPhongMaterial({
      color: color,
      side: THREE.DoubleSide,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    group.userData.material = mat;

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1.5 });

    [def.b1, def.b2, def.t1, def.t2].forEach(verts => {
      if (!verts) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts.flat()), 3));
      geo.setIndex([0, 1, 2]);
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    });

    // Store snap points in local coordinates
    group.userData.snapPoints = this._computeSnapPoints(def);

    return group;
  }

  // ── Snap System ──

  _computeSnapPoints(def) {
    // Compute tab tips and pocket positions from the geometry.
    // Each snap point has: type, pos (Vector3), dir (Vector3 - normalized direction)
    //   - Pocket dir = direction the pocket opening faces (outward along ridge axis)
    //   - Tab dir = direction the tab points outward from body
    const points = [];

    if (def.b1 && def.b2) {
      const a = new THREE.Vector3(...def.b1[0]);  // A-end ridge point
      const b = new THREE.Vector3(...def.b1[1]);  // B-end ridge point
      const apex1 = new THREE.Vector3(...def.b1[2]);
      const apex2 = new THREE.Vector3(...def.b2[2]);

      // Ridge midpoint
      const ridgeMid = a.clone().add(b).multiplyScalar(0.5);

      // Pocket positions = ridge endpoints (where the opening actually is)
      // Pocket directions = outward along ridge axis from center
      const dirA = a.clone().sub(ridgeMid).normalize();
      const dirB = b.clone().sub(ridgeMid).normalize();

      points.push(
        { type: 'pocket', pos: a.clone(), dir: dirA },
        { type: 'pocket', pos: b.clone(), dir: dirB },
      );

      // Tab tips + directions
      if (def.t1) {
        const tip = new THREE.Vector3(...def.t1[2]);
        const base = a.clone().add(apex1).multiplyScalar(0.5); // midpoint of tab base edge
        const tabDir = tip.clone().sub(base).normalize();
        points.push({ type: 'tab', pos: tip.clone(), dir: tabDir });
      }
      if (def.t2) {
        const tip = new THREE.Vector3(...def.t2[2]);
        const base = b.clone().add(apex2).multiplyScalar(0.5);
        const tabDir = tip.clone().sub(base).normalize();
        points.push({ type: 'tab', pos: tip.clone(), dir: tabDir });
      }
    }

    return points;
  }

  _getWorldSnapPoints(unit) {
    unit.updateMatrixWorld(true);
    const points = unit.userData.snapPoints || [];
    return points.map(p => ({
      type: p.type,
      pos: p.pos.clone().applyMatrix4(unit.matrixWorld),
      dir: p.dir.clone().transformDirection(unit.matrixWorld),
    }));
  }

  _findBestSnapPair(movedUnit, threshold) {
    const movedPoints = this._getWorldSnapPoints(movedUnit);
    if (movedPoints.length === 0) return null;

    let bestDist = threshold;
    let bestPair = null;
    let bestOther = null;

    for (const other of this.units) {
      if (other === movedUnit) continue;
      const otherPoints = this._getWorldSnapPoints(other);

      for (const mp of movedPoints) {
        for (const op of otherPoints) {
          // Only snap tab ↔ pocket
          if (mp.type === op.type) continue;
          const dist = mp.pos.distanceTo(op.pos);
          if (dist < bestDist) {
            bestDist = dist;
            bestPair = { movedPoint: mp, otherPoint: op, dist };
            bestOther = other;
          }
        }
      }
    }

    return bestPair ? { ...bestPair, otherUnit: bestOther } : null;
  }

  _trySnap(movedUnit) {
    const pair = this._findBestSnapPair(movedUnit, this.snapThreshold);
    if (!pair) return;

    const { movedPoint, otherPoint, otherUnit } = pair;

    // Detach transform controls during snap to avoid conflicts
    this.transformControls.detach();

    // Step 1: Rotation alignment
    // We want the moved unit's tab/pocket dir to face opposite to the target's dir
    // (tab points INTO pocket, pocket opens TOWARD tab)
    const srcDir = movedPoint.dir.clone().normalize();
    const tgtDir = otherPoint.dir.clone().negate().normalize();

    // Guard against near-parallel vectors (already aligned)
    const dot = srcDir.dot(tgtDir);
    if (dot < 0.999) {
      const quat = new THREE.Quaternion().setFromUnitVectors(srcDir, tgtDir);

      // Rotate around the snap point (not unit origin)
      // 1. Translate so snap point is at origin
      // 2. Apply rotation
      // 3. Translate back
      const pivot = movedPoint.pos.clone();
      movedUnit.position.sub(pivot);
      movedUnit.position.applyQuaternion(quat);
      movedUnit.position.add(pivot);
      movedUnit.quaternion.premultiply(quat);
      movedUnit.updateMatrixWorld(true);
    }

    // Step 2: Translate to align positions (recompute after rotation)
    const updatedPoints = this._getWorldSnapPoints(movedUnit);
    // Find the matching snap point on the moved unit (same type)
    let bestUpdated = updatedPoints.find(p => p.type === movedPoint.type);
    if (!bestUpdated) bestUpdated = updatedPoints[0];

    const offset = otherPoint.pos.clone().sub(bestUpdated.pos);
    movedUnit.position.add(offset);
    movedUnit.updateMatrixWorld(true);

    // Reattach transform controls
    this.transformControls.attach(movedUnit);

    // Snap success feedback
    this._flashSnap(movedUnit, otherUnit);
    this._setStatus('Snapped!');
  }

  _updateSnapProximity() {
    if (!this.isDragging || !this.selectedUnit) return;

    const pair = this._findBestSnapPair(this.selectedUnit, this.proximityThreshold);

    // Clear previous proximity visuals
    if (this.proximityLine) {
      this.scene.remove(this.proximityLine);
      this.proximityLine = null;
    }
    if (this.highlightedHelper) {
      this.highlightedHelper.material = this.highlightedHelper.userData.origMat;
      this.highlightedHelper.scale.setScalar(1);
      this.highlightedHelper = null;
    }

    if (!pair) {
      this._setStatus('Drag near another unit to connect.');
      return;
    }

    const { movedPoint, otherPoint, dist } = pair;

    // Draw dashed line between closest pair
    const lineGeo = new THREE.BufferGeometry().setFromPoints([movedPoint.pos, otherPoint.pos]);
    const lineMat = new THREE.LineDashedMaterial({
      color: dist < this.snapThreshold ? 0x00ff88 : 0xffaa00,
      dashSize: 0.1,
      gapSize: 0.05,
      linewidth: 1,
    });
    this.proximityLine = new THREE.Line(lineGeo, lineMat);
    this.proximityLine.computeLineDistances();
    this.scene.add(this.proximityLine);

    // Highlight the closest snap helper sphere
    for (const helper of this.snapHelpers) {
      const helperDist = helper.position.distanceTo(otherPoint.pos);
      if (helperDist < 0.15) {
        helper.userData.origMat = helper.material;
        const glowMat = new THREE.MeshBasicMaterial({
          color: dist < this.snapThreshold ? 0xffffff : 0xffff66,
          transparent: true,
          opacity: 0.9,
        });
        helper.material = glowMat;
        helper.scale.setScalar(dist < this.snapThreshold ? 1.8 : 1.3);
        this.highlightedHelper = helper;
        break;
      }
    }

    // Status feedback
    if (dist < this.snapThreshold) {
      this._setStatus('Release to snap!');
    } else {
      this._setStatus('Getting close...');
    }
  }

  _flashSnap(unit1, unit2) {
    // Brief emissive pulse on both snapped units
    const flash = (unit, startTime) => {
      const duration = 350;
      const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Ease out: bright flash → fade to normal
        const intensity = (1 - t) * 0.5;
        unit.children.forEach(child => {
          if (child.isMesh && child.material) {
            child.material.emissive = new THREE.Color(intensity, intensity, intensity);
          }
        });
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          // Restore: selected unit keeps highlight, other resets
          const isSelected = unit === this.selectedUnit;
          this._setHighlight(unit, isSelected);
        }
      };
      tick();
    };

    const now = performance.now();
    flash(unit1, now);
    flash(unit2, now);
  }

  _showSnapHelpers(excludeUnit) {
    this._hideSnapHelpers();

    const helperGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const pocketMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.5,
    });
    const tabMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.4,
    });

    for (const unit of this.units) {
      if (unit === excludeUnit) continue;
      const points = this._getWorldSnapPoints(unit);
      for (const p of points) {
        const mesh = new THREE.Mesh(helperGeo, p.type === 'pocket' ? pocketMat : tabMat);
        mesh.position.copy(p.pos);
        this.scene.add(mesh);
        this.snapHelpers.push(mesh);
      }
    }
  }

  _hideSnapHelpers() {
    this.snapHelpers.forEach(h => this.scene.remove(h));
    this.snapHelpers = [];
    if (this.proximityLine) {
      this.scene.remove(this.proximityLine);
      this.proximityLine = null;
    }
    this.highlightedHelper = null;
  }

  // ── Selection Highlight ──

  _setHighlight(unit, highlighted) {
    unit.children.forEach(child => {
      if (child.isMesh && child.material) {
        if (highlighted) {
          child.material.emissive = new THREE.Color(0x333333);
        } else {
          child.material.emissive = new THREE.Color(0x000000);
        }
      }
    });
  }

  // ── Events ──

  _onPointerDown(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.units, true);

    if (intersects.length > 0) {
      // Find the top-level unit group
      let obj = intersects[0].object;
      while (obj.parent && obj.parent !== this.scene) {
        obj = obj.parent;
      }
      this.selectUnit(obj);
    } else if (!this.transformControls.dragging) {
      this.selectUnit(null);
    }
  }

  _onKeyDown(event) {
    switch (event.key.toLowerCase()) {
      case 't':
        this.transformControls.setMode('translate');
        if (this.onModeChange) this.onModeChange('TRANSLATE');
        break;
      case 'r':
        this.transformControls.setMode('rotate');
        if (this.onModeChange) this.onModeChange('ROTATE');
        break;
      case 'delete':
      case 'backspace':
        this.removeSelected();
        break;
    }
  }

  _onResize() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
    if (this.controls) this.controls.handleResize();
  }

  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());
    if (this.controls) this.controls.update();
    if (this.isDragging) this._updateSnapProximity();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  _updateCounter() {
    if (this.onUnitCountChange) {
      this.onUnitCountChange(this.units.length);
    }
  }

  _setStatus(msg) {
    if (this.onStatusChange) {
      this.onStatusChange(msg);
    }
  }

  destroy() {
    window.removeEventListener('resize', this._onResizeBound);
    window.removeEventListener('keydown', this._onKeyDownBound);
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}

export { UNIT_COLORS };
