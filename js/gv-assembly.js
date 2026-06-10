/**
 * Logic for assembling Golden Venture units into 3D models.
 *
 * Rows are rings of interlocked units: each ring's circumference is the row
 * count times the unit base width (so neighbors touch), and successive rows
 * nest roughly half a unit height into the row below (points into pockets),
 * offset half a pitch in the classic brick pattern. The wall tilt at each
 * row follows the slope of the radius profile, so expanding/contracting row
 * counts produce vases and spheres.
 *
 * Parts whose rows are all 1-2 units wide (swan necks, tails) are rendered
 * as curved chains of stacked units instead of degenerate rings.
 */

import { createGVUnitGeometry, GV_UNIT } from './gv-unit-mesh.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class GVAssemblyView {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.unitGroup = new THREE.Group();
    this.ready = false;

    this.unitGeo = null;
    this.unitMat = null;
    this.instancedMesh = null;
    this.autoRotate = false;

    // Stacking constants
    this.UNIT_WIDTH = GV_UNIT.WIDTH * 0.96; // circumference per unit (slight squeeze)
    this.ROW_HEIGHT = GV_UNIT.HEIGHT * 0.55; // vertical stride: rows nest into each other
  }

  init(containerEl) {
    this.container = containerEl;
    const rect = containerEl.getBoundingClientRect();
    const w = rect.width || 640;
    const h = rect.height || 480;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.camera.position.set(10, 10, 15);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    containerEl.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 100;
    this.controls.target.set(0, 2, 0);

    // Ensure the canvas can capture focus for keys/scroll
    this.renderer.domElement.addEventListener('click', () => {
      this.renderer.domElement.focus();
    });
    this.renderer.domElement.tabIndex = 0;

    this.scene.add(new THREE.AmbientLight(0x404060, 0.9 * Math.PI));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7 * Math.PI);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x4488cc, 0.3 * Math.PI);
    backLight.position.set(-5, -2, -5);
    this.scene.add(backLight);

    this.scene.add(this.unitGroup);

    this.unitGeo = createGVUnitGeometry(THREE);
    this.unitMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0,
    });

    this.ready = true;
    this._animate();
  }

  setCinematicMode(enabled) {
    this.autoRotate = enabled;
    if (!enabled) {
      this.unitGroup.rotation.set(0, 0, 0);
    }
  }

  clear() {
    if (this.instancedMesh) {
      this.unitGroup.remove(this.instancedMesh);
      this.instancedMesh.dispose();
      this.instancedMesh = null;
    }
    while (this.unitGroup.children.length > 0) {
      const obj = this.unitGroup.children[0];
      if (obj.geometry && obj.geometry !== this.unitGeo) obj.geometry.dispose();
      if (obj.material && obj.material !== this.unitMat) obj.material.dispose();
      this.unitGroup.remove(obj);
    }
  }

  _isChainPart(part) {
    if (part.rows.length < 3) return false;
    return part.rows.every((row) => row.pieces.reduce((s, p) => s + p.count, 0) <= 2);
  }

  /**
   * Render a full model using InstancedMesh for performance.
   */
  renderModel(model) {
    this.clear();
    let currentBaseY = 0;

    let totalCount = 0;
    model.parts.forEach((part) => {
      part.rows.forEach((row) => {
        row.pieces.forEach((p) => { totalCount += p.count; });
      });
    });
    if (totalCount === 0) return;

    this.instancedMesh = new THREE.InstancedMesh(this.unitGeo, this.unitMat, totalCount);
    this.instancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.unitGroup.add(this.instancedMesh);

    const helper = new THREE.Object3D();
    const color = new THREE.Color();
    let instanceIdx = 0;
    const place = (piece) => {
      helper.updateMatrix();
      this.instancedMesh.setMatrixAt(instanceIdx, helper.matrix);
      this.instancedMesh.setColorAt(instanceIdx, color.set(piece.color));
      instanceIdx++;
    };

    model.parts.forEach((part) => {
      if (this._isChainPart(part)) {
        currentBaseY = this._renderChain(part, currentBaseY, helper, place);
        return;
      }

      // Radius profile of the part, one entry per row.
      const radii = part.rows.map((row) => {
        const n = row.pieces.reduce((s, p) => s + p.count, 0);
        return (n * this.UNIT_WIDTH) / (2 * Math.PI);
      });

      let partY = currentBaseY;
      part.rows.forEach((row, rowIndex) => {
        const totalInRow = row.pieces.reduce((s, p) => s + p.count, 0);
        const radius = radii[rowIndex];
        const angleStep = (2 * Math.PI) / totalInRow;

        // Wall tilt follows the slope of the radius profile
        // (central difference; one-sided at the ends).
        const rPrev = radii[rowIndex - 1] ?? radius;
        const rNext = radii[rowIndex + 1] ?? radius;
        const span = (rowIndex > 0 && rowIndex < radii.length - 1) ? 2 : 1;
        const tilt = Math.atan2(rNext - rPrev, span * this.ROW_HEIGHT);

        const offsetAngle = (row.alignment === 'offset') ? angleStep / 2 : 0;
        let currentAngle = offsetAngle;

        row.pieces.forEach((piece) => {
          for (let i = 0; i < piece.count; i++) {
            helper.position.set(
              radius * Math.cos(currentAngle),
              partY,
              radius * Math.sin(currentAngle),
            );
            // Face outward (+z of the unit is its outward side), then lean
            // with the wall slope.
            helper.rotation.set(0, Math.PI / 2 - currentAngle, 0);
            helper.rotateX(tilt);
            place(piece);
            currentAngle += angleStep;
          }
        });

        partY += this.ROW_HEIGHT * Math.max(0.55, Math.cos(tilt));
      });

      currentBaseY = partY + 0.6; // gap between parts
    });

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) this.instancedMesh.instanceColor.needsUpdate = true;

    this._frameModel();
  }

  /** Aim the camera so the whole model fills the view comfortably. */
  _frameModel() {
    if (!this.instancedMesh) return;
    this.instancedMesh.computeBoundingBox();
    const box = this.instancedMesh.boundingBox;
    if (!box || box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) / 2 || 1;
    const dist = (radius / Math.tan((this.camera.fov * Math.PI / 180) / 2)) * 1.3;

    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + dist * 0.5,
      center.y + dist * 0.45,
      center.z + dist * 0.75,
    );
    this.camera.lookAt(center);
  }

  /**
   * Render a narrow part (neck, tail) as a chain of nested units that
   * curves forward, the way GV chains are bent in real models.
   */
  _renderChain(part, baseY, helper, place) {
    const stride = this.ROW_HEIGHT;
    const bendPerUnit = Math.min(0.12, 2.4 / Math.max(1, part.rows.length));

    const pos = new THREE.Vector3(0, baseY, 0);
    const step = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const bend = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), bendPerUnit);

    let topY = baseY;
    part.rows.forEach((row) => {
      row.pieces.forEach((piece) => {
        for (let i = 0; i < piece.count; i++) {
          helper.position.copy(pos);
          helper.quaternion.copy(quat);
          place(piece);
        }
      });
      quat.multiply(bend);
      step.set(0, stride, 0).applyQuaternion(quat);
      pos.add(step);
      topY = Math.max(topY, pos.y);
    });

    return topY + 0.6;
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (this.ready) {
      if (this.autoRotate && this.unitGroup) {
        this.unitGroup.rotation.y += 0.005;
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }

  show() {
    if (this.container) this.container.style.display = "block";
  }

  hide() {
    if (this.container) this.container.style.display = "none";
  }
}
