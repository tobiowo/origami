import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class FoldingView {
  constructor() {
    this.simulator = null;
    this.container = null;
    this.currentStepFunc = null;
    this.autoRotate = false;
    this.dynamicLight = null;
    this.animationId = null;
    this._panState = null;
    this._vertexLabels = [];
    // Three.js flap overlay for step 6 (avoids physics deadlock)
    this._flap = null;
    this._flapLines = null;
    this._flapAngle = 0;
    this._flapVisible = false;
  }

  init(container) {
    this.container = container;
    this.simulator = OrigamiSimulator({
      parent: container,
      simulationRunning: true,
      backgroundColor: "0d0d1a",
      color1: "4488cc",
      color2: "336699",
      edgesVisible: true,
      mtnsVisible: true,
      valleysVisible: true,
      boundaryEdgesVisible: true,
      passiveEdgesVisible: false,
      panelsVisible: false,
      percentDamping: 0.9,  // high damping → converges in ~1 frame after mesh reload
      numSteps: 400,        // more iterations/frame → eliminates oscillation jank
    });
    window.simulator = this.simulator;

    // Create a group for vertex labels
    this.labelGroup = new THREE.Group();

    // Add cinematic light
    const three = this.simulator.threeView;
    if (three) {
      three.scene.add(this.labelGroup);
      // Disable built-in rotation to avoid conflict with OrbitControls
      if (typeof three.enableCameraRotate === 'function') {
        three.enableCameraRotate(false);
      }

      this.dynamicLight = new THREE.PointLight(0xffffff, 0.8, 10);
      three.scene.add(this.dynamicLight);
      
      // Use OrbitControls for rotate + zoom only; pan is handled via modelWrapper below
      if (three.renderer && three.renderer.domElement) {
        this.controls = new OrbitControls(three.camera, three.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false; // camera-space pan conflicts with TrackballControls.update()
        this._initPan(three);
      }
    }

    setTimeout(() => {
      if (this.simulator && this.simulator.threeView) {
        this.simulator.threeView.onWindowResize();
      }
    }, 100);

    this._animate();
  }

  setRotation(x, y, z) {
    if (this.simulator && this.simulator.threeView && this.simulator.threeView.modelWrapper) {
      this.simulator.threeView.modelWrapper.rotation.set(x, y, z);
    }
  }

  setCinematicMode(enabled) {
    this.autoRotate = enabled;
    if (!enabled && this.simulator && this.simulator.threeView && this.simulator.threeView.modelWrapper) {
      // Reset rotation of the entire model wrapper
      this.simulator.threeView.modelWrapper.rotation.set(0, 0, 0);
    }
  }

  setFixedFace(index) {
    this._fixedFace = index;
    if (this.simulator) {
      this.simulator.fixedFace = index;
    }
  }

  _initPan(three) {
    const canvas = three.renderer.domElement;

    // Prevent the browser context menu so right-click drag works uninterrupted
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('pointerdown', e => {
      if (e.button === 1 || e.button === 2) { // middle or right mouse button
        this._panState = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (!this._panState || !three.modelWrapper) return;
      const dx = e.clientX - this._panState.x;
      const dy = e.clientY - this._panState.y;
      this._panState = { x: e.clientX, y: e.clientY };

      // Scale pixels → world units using camera FOV and distance
      const camera = three.camera;
      const distance = camera.position.length();
      const fov = camera.fov * Math.PI / 180;
      const panScale = 2 * Math.tan(fov / 2) * distance / canvas.clientHeight;

      // Translate in the camera's local right/up axes so panning is screen-aligned
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up    = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
      three.modelWrapper.position.addScaledVector(right, -dx * panScale);
      three.modelWrapper.position.addScaledVector(up,     dy * panScale);
    });

    canvas.addEventListener('pointerup', e => {
      if (e.button === 1 || e.button === 2) this._panState = null;
    });
  }

  resetPan() {
    if (this.simulator && this.simulator.threeView && this.simulator.threeView.modelWrapper) {
      this.simulator.threeView.modelWrapper.position.set(0, 0, 0);
    }
  }

  // ── Step-6 Three.js flap overlay ────────────────────────────────────────
  // The physics simulator can't bake 4 prior folds + animate C-D without
  // deadlock.  Instead we keep the step-5 gem in the simulator and animate
  // the C-J-K-D flap as a plain Three.js mesh rotated around the C-D axis.

  _initFlap(three) {
    // Quad: two triangles — C(0)-J(1)-K(2) and C(0)-K(2)-D(3)
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3));
    geom.setIndex([0, 1, 2, 0, 2, 3]);
    geom.computeVertexNormals();
    const mat = new THREE.MeshPhongMaterial({ color: 0x4488cc, side: THREE.DoubleSide });
    this._flap = new THREE.Mesh(geom, mat);
    this._flap.visible = false;
    three.modelWrapper.add(this._flap);

    // Boundary + crease lines: [C,J], [J,K], [K,D], [C,D]
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
    this._flapLines = new THREE.LineSegments(lineGeom, new THREE.LineBasicMaterial({ color: 0x000000 }));
    this._flapLines.visible = false;
    three.modelWrapper.add(this._flapLines);
  }

  showFlap() {
    this._flapVisible = true;
    if (!this._flap) {
      const three = this.simulator && this.simulator.threeView;
      if (three && three.modelWrapper) this._initFlap(three);
    }
    if (this._flap) this._flap.visible = true;
    if (this._flapLines) this._flapLines.visible = true;
  }

  hideFlap() {
    this._flapVisible = false;
    if (this._flap) this._flap.visible = false;
    if (this._flapLines) this._flapLines.visible = false;
  }

  setFlapAngle(angle) {
    this._flapAngle = angle;
  }

  _updateFlapPositions() {
    if (!this._flap || !this.simulator || !this.simulator.model) return;
    const pos = this.simulator.model.getPositionsArray();
    // Step-5 mesh: E=0, C=1, D=2
    if (pos.length < 9) return;

    const E = new THREE.Vector3(pos[0], pos[1], pos[2]);
    const C = new THREE.Vector3(pos[3], pos[4], pos[5]);
    const D = new THREE.Vector3(pos[6], pos[7], pos[8]);

    // C-D axis
    const CD = new THREE.Vector3().subVectors(D, C);
    const cd = CD.clone().normalize();

    // Front-face normal of E-C-D: cross(D-C, E-C)
    const n = new THREE.Vector3().crossVectors(CD, new THREE.Vector3().subVectors(E, C)).normalize();

    // Initial direction from the base line toward the flap top
    // (perpendicular to C-D, away from E):
    const initialDir = new THREE.Vector3().crossVectors(cd, n).normalize();

    // The 'Gem' overhang is centered and 0.5 units wide (half the 1.0 base).
    // Flap top corners P' and Q' are at distance 0.25 from the center.
    const center = new THREE.Vector3().addVectors(C, D).multiplyScalar(0.5);
    const P_base = center.clone().addScaledVector(cd, -0.25 * CD.length());
    const Q_base = center.clone().addScaledVector(cd, 0.25 * CD.length());

    const flapHeight = 0.25 * CD.length();

    // Rotate P' and Q' around the C-D axis
    const quat = new THREE.Quaternion().setFromAxisAngle(cd, -this._flapAngle);
    const P_top = P_base.clone().add(new THREE.Vector3().copy(initialDir).multiplyScalar(flapHeight).applyQuaternion(quat));
    const Q_top = Q_base.clone().add(new THREE.Vector3().copy(initialDir).multiplyScalar(flapHeight).applyQuaternion(quat));

    // Update flap mesh vertices: P_base, P_top, Q_top, Q_base
    const fp = this._flap.geometry.attributes.position.array;
    fp[0]=P_base.x; fp[1]=P_base.y; fp[2]=P_base.z;
    fp[3]=P_top.x;  fp[4]=P_top.y;  fp[5]=P_top.z;
    fp[6]=Q_top.x;  fp[7]=Q_top.y;  fp[8]=Q_top.z;
    fp[9]=Q_base.x; fp[10]=Q_base.y; fp[11]=Q_base.z;
    this._flap.geometry.attributes.position.needsUpdate = true;
    this._flap.geometry.computeVertexNormals();

    // Update edge lines
    if (this._flapLines) {
      const lp = this._flapLines.geometry.attributes.position.array;
      lp[0]=P_base.x; lp[1]=P_base.y; lp[2]=P_base.z;
      lp[3]=P_top.x;  lp[4]=P_top.y;  lp[5]=P_top.z;
      lp[6]=P_top.x;  lp[7]=P_top.y;  lp[8]=P_top.z;
      lp[9]=Q_top.x;  lp[10]=Q_top.y; lp[11]=Q_top.z;
      lp[12]=Q_top.x; lp[13]=Q_top.y; lp[14]=Q_top.z;
      lp[15]=Q_base.x; lp[16]=Q_base.y; lp[17]=Q_base.z;
      lp[18]=P_base.x; lp[19]=P_base.y; lp[20]=P_base.z;
      lp[21]=Q_base.x; lp[22]=Q_base.y; lp[23]=Q_base.z;
      this._flapLines.geometry.attributes.position.needsUpdate = true;
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());
    
    if (this.controls) this.controls.update();

    const time = performance.now() * 0.001;

    // Rotate model wrapper (contains meshes and lines)
    if (this.autoRotate && this.simulator && this.simulator.threeView && this.simulator.threeView.modelWrapper) {
      this.simulator.threeView.modelWrapper.rotation.y += 0.005;
    }

    // Update flap overlay (step 6)
    if (this._flapVisible) this._updateFlapPositions();

    // Update vertex labels positions
    this._updateLabels();

    // Orbit light
    if (this.dynamicLight && this.simulator && this.simulator.threeView) {
      this.dynamicLight.position.x = Math.sin(time * 0.8) * 3;
      this.dynamicLight.position.z = Math.cos(time * 0.8) * 3;
      this.dynamicLight.position.y = Math.sin(time * 0.6) * 1.5 + 1.5;
    }
  }

  show() {
    if (this.container) {
      this.container.style.display = "block";
      setTimeout(() => {
        if (this.simulator && this.simulator.threeView) {
          this.simulator.threeView.onWindowResize();
        }
      }, 50);
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }

  /**
   * Clears existing labels and creates new ones for the current FOLD object.
   */
  drawVertexLabels(fold) {
    // Clear old labels
    while (this.labelGroup.children.length > 0) {
      this.labelGroup.remove(this.labelGroup.children[0]);
    }
    this._vertexLabels = [];

    if (!fold || !fold.vertices_coords) return;

    fold.vertices_coords.forEach((coord, i) => {
      const sprite = this._makeTextSprite(i.toString());
      this.labelGroup.add(sprite);
      this._vertexLabels.push({ sprite, index: i });
    });
  }

  _makeTextSprite(message) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;
    
    context.font = "Bold 40px Arial";
    context.fillStyle = "rgba(255, 255, 255, 1.0)";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(message, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.15, 0.15, 1);
    return sprite;
  }

  _updateLabels() {
    if (!this.simulator || !this.simulator.model || !this._vertexLabels.length) return;
    
    const positions = this.simulator.model.getPositionsArray();
    if (!positions) return;
    const three = this.simulator.threeView;
    if (!three || !three.modelWrapper) return;

    this._vertexLabels.forEach(item => {
      const i = item.index;
      // Get current simulated 3D position
      const x = positions[3 * i];
      const y = positions[3 * i + 1];
      const z = positions[3 * i + 2];
      
      if (x === undefined) return;

      const pos = new THREE.Vector3(x, y, z);
      // Apply modelWrapper transformation to match visual position
      pos.applyMatrix4(three.modelWrapper.matrixWorld);
      item.sprite.position.copy(pos);
    });
  }

  loadPattern(foldObj) {
    if (!this.simulator) return;
    const currentPercent = this.simulator.foldPercent;
    this.simulator.loadFOLD(JSON.parse(JSON.stringify(foldObj)));
    this.simulator.foldPercent = currentPercent;
    // Re-apply fixedFace after reload (loadFOLD resets it).
    if (this._fixedFace !== undefined) {
      this.simulator.fixedFace = this._fixedFace;
    }
  }

  /**
   * Load the fold pattern for a specific step, then set foldPercent.
   * Each step has its own set of active creases/angles.
   */
  updateStepState(stepFunc, percent) {
    if (!this.simulator) return;

    if (this.currentStepFunc !== stepFunc) {
      this.currentStepFunc = stepFunc;
      import('./sonobe.js').then(m => {
        // Load the pattern with full target angles (percent = 1)
        // The simulator will interpolate based on foldPercent
        const fold = m.getSonobeForStep(stepFunc, 1);
        this.loadPattern(fold);
        this.setFoldPercent(percent);
      });
    } else {
      this.setFoldPercent(percent);
    }
  }

  setFoldPercent(percent) {
    if (!this.simulator) return;
    this.simulator.foldPercent = Math.max(0, Math.min(1, percent));
  }

  getFoldPercent() {
    if (!this.simulator) return 0;
    return this.simulator.foldPercent;
  }
}
