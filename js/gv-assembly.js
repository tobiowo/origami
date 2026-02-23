/**
 * Logic for assembling Golden Venture units into 3D models.
 * Improved with Phase 3: Multi-Row Stacking + Curvature.
 */

import { createGVUnitGeometry } from './gv-unit-mesh.js';
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
    
    // Constants for unit scaling and stacking
    this.UNIT_WIDTH = 0.42; // Physical width of a unit in the ring
    this.ROW_HEIGHT = 0.38; // Vertical height of one interlocked row
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
    
    this.scene.add(new THREE.AmbientLight(0x404060, 0.9));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x4488cc, 0.3);
    backLight.position.set(-5, -2, -5);
    this.scene.add(backLight);

    this.scene.add(this.unitGroup);

    this.unitGeo = createGVUnitGeometry(THREE);
    this.unitMat = new THREE.MeshPhongMaterial({ 
      color: 0xffffff, 
      side: THREE.DoubleSide, 
      flatShading: true,
      shininess: 30
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

  /**
   * Render a simple ring of units.
   */
  addRing(count, rowIndex = 0, color = 0x4488cc) {
    const radius = (count * this.UNIT_WIDTH) / (2 * Math.PI);
    const angleStep = (2 * Math.PI) / count;
    const offsetAngle = (rowIndex % 2 === 0) ? 0 : angleStep / 2;

    const mat = this.unitMat.clone();
    mat.color.set(color);

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep + offsetAngle;
      const mesh = new THREE.Mesh(this.unitGeo, mat);
      
      mesh.position.set(
        radius * Math.cos(angle),
        rowIndex * this.ROW_HEIGHT,
        radius * Math.sin(angle)
      );
      
      mesh.rotation.y = -angle - Math.PI/2;
      this.unitGroup.add(mesh);
    }
  }

  clear() {
    if (this.instancedMesh) {
      if (this.instancedMesh.geometry) this.instancedMesh.geometry.dispose();
      if (this.instancedMesh.material) this.instancedMesh.material.dispose();
      this.unitGroup.remove(this.instancedMesh);
      this.instancedMesh = null;
    }
    while(this.unitGroup.children.length > 0) {
      const obj = this.unitGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.unitGroup.remove(obj);
    }
  }

  /**
   * Render a full model with curvature using InstancedMesh for performance.
   */
  renderModel(model) {
    this.clear();
    let currentBaseY = 0;

    // 1. Count total units
    let totalCount = 0;
    model.parts.forEach(part => {
      part.rows.forEach(row => {
        row.pieces.forEach(p => {
          totalCount += p.count;
        });
      });
    });

    if (totalCount === 0) return;

    // 2. Initialize InstancedMesh
    this.instancedMesh = new THREE.InstancedMesh(this.unitGeo, this.unitMat, totalCount);
    this.instancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.unitGroup.add(this.instancedMesh);

    const helper = new THREE.Object3D();
    let instanceIdx = 0;

    model.parts.forEach(part => {
      let prevRadius = null;
      let partY = currentBaseY;
      
      part.rows.forEach((row, rowIndex) => {
        const totalInRow = row.pieces.reduce((sum, p) => sum + p.count, 0);
        const radius = (totalInRow * this.UNIT_WIDTH) / (2 * Math.PI);
        const angleStep = (2 * Math.PI) / totalInRow;
        
        // Tilt calculation: 
        // We look at the change in radius relative to the row below.
        let tilt = 0;
        if (prevRadius !== null) {
          const dr = radius - prevRadius;
          // Slope-based tilt (inverted: narrowing dr < 0 gives positive tilt, which is inward)
          tilt = Math.atan2(-dr, this.ROW_HEIGHT);
          
          // Refinement for narrowing/closing sections
          if (dr < -0.01) {
            tilt += 0.15; // Extra inward bias (positive) to close spheres
          }
          
          // Refinement for constant radius rows
          if (Math.abs(dr) < 0.001) {
            // Midpoint-based tilt: flare out initially (negative), then tilt in (positive).
            tilt = (rowIndex >= part.rows.length / 2) ? 0.15 : -0.1;
          }
        } else {
          // Bottom row: slight outward tilt (negative) for stability
          tilt = -0.15;
        }

        const offsetAngle = (row.alignment === 'offset') ? angleStep / 2 : 0;
        let currentAngle = 0;

        row.pieces.forEach(piece => {
          const color = new THREE.Color(piece.color);

          for (let i = 0; i < piece.count; i++) {
            const angle = currentAngle + offsetAngle;
            
            helper.position.set(
              radius * Math.cos(angle),
              partY,
              radius * Math.sin(angle)
            );
            
            // Set rotation: Y for ring placement, then X for tilt
            helper.rotation.set(0, -angle - Math.PI / 2, 0);
            helper.rotateX(tilt); 
            helper.updateMatrix();

            this.instancedMesh.setMatrixAt(instanceIdx, helper.matrix);
            this.instancedMesh.setColorAt(instanceIdx, color);
            
            instanceIdx++;
            currentAngle += angleStep;
          }
        });
        
        // Increment Y for the next row, adjusting for tilt
        // (If tilted significantly, the vertical stride is smaller)
        const stride = this.ROW_HEIGHT * Math.max(0.5, Math.cos(tilt));
        partY += stride;
        prevRadius = radius;
      });
      
      currentBaseY = partY + 0.5; // Gap between parts
    });

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) this.instancedMesh.instanceColor.needsUpdate = true;
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
