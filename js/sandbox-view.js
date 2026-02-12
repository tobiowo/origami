/**
 * Three.js Sandbox for interacting with Sonobe units.
 */

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
  }

  init(containerEl) {
    this.container = containerEl;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d1a);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    containerEl.appendChild(this.renderer.domElement);

    // Trackball Controls (View)
    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 2.0;
    this.controls.staticMoving = true;

    // Transform Controls (Move/Rotate)
    this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value;
    });
    this.scene.add(this.transformControls);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x404060, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    // Grid helper for spatial reference
    const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    this.scene.add(grid);

    // Events
    window.addEventListener('resize', () => this._onResize());
    this.renderer.domElement.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    window.addEventListener('keydown', (e) => this._onKeyDown(e));

    this._animate();
  }

  addUnit() {
    const color = UNIT_COLORS[this.units.length % UNIT_COLORS.length];
    const unit = this._createSonobeUnit(color);
    
    // Position randomly near center
    unit.position.set(
      (Math.random() - 0.5) * 2,
      0.5,
      (Math.random() - 0.5) * 2
    );
    
    this.scene.add(unit);
    this.units.push(unit);
    this.selectUnit(unit);
  }

  selectUnit(unit) {
    this.selectedUnit = unit;
    if (unit) {
      this.transformControls.attach(unit);
    } else {
      this.transformControls.detach();
    }
  }

  removeSelected() {
    if (this.selectedUnit) {
      this.scene.remove(this.selectedUnit);
      this.units = this.units.filter(u => u !== this.selectedUnit);
      this.transformControls.detach();
      this.selectedUnit = null;
    }
  }

  _onPointerDown(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.units, true);

    if (intersects.length > 0) {
      // Find the top-level group
      let obj = intersects[0].object;
      while (obj.parent && obj.parent !== this.scene) {
        obj = obj.parent;
      }
      this.selectUnit(obj);
    } else if (!this.transformControls.dragging) {
      // If clicking empty space, deselect only if not dragging the gizmo
      // Actually, TransformControls prevents bubbling if clicking axis, 
      // so if we are here, we really clicked empty space.
      this.selectUnit(null);
    }
  }

  _onKeyDown(event) {
    switch (event.key.toLowerCase()) {
      case 't': this.transformControls.setMode('translate'); break;
      case 'r': this.transformControls.setMode('rotate'); break;
      case 'delete':
      case 'backspace': this.removeSelected(); break;
    }
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Re-using the geometry creation logic from AssemblyView.
   */
  _createSonobeUnit(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({
      color: color,
      side: THREE.DoubleSide,
      flatShading: true,
      transparent: true,
      opacity: 0.9,
    });

    const s = 1.0; 
    const tabSize = 0.5;

    // Body
    const bodyGeo = new THREE.PlaneGeometry(s, s);
    const bodyMesh = new THREE.Mesh(bodyGeo, mat);
    bodyMesh.rotation.x = -Math.PI / 2; // Flat on XZ plane
    group.add(bodyMesh);

    // Tab 1 (Front edge, folds down)
    const tab1Geo = new THREE.BufferGeometry();
    const v1 = new Float32Array([
      -s/2, 0,  s/2,
       s/2, 0,  s/2,
       0,  -tabSize, s/2,
    ]);
    tab1Geo.setAttribute('position', new THREE.BufferAttribute(v1, 3));
    tab1Geo.computeVertexNormals();
    group.add(new THREE.Mesh(tab1Geo, mat));

    // Tab 2 (Back edge, folds up)
    const tab2Geo = new THREE.BufferGeometry();
    const v2 = new Float32Array([
      -s/2, 0, -s/2,
       s/2, 0, -s/2,
       0,   tabSize, -s/2,
    ]);
    tab2Geo.setAttribute('position', new THREE.BufferAttribute(v2, 3));
    tab2Geo.computeVertexNormals();
    group.add(new THREE.Mesh(tab2Geo, mat));

    // Wireframes
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000 });
    [bodyGeo, tab1Geo, tab2Geo].forEach(geo => {
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
      if (geo === bodyGeo) line.rotation.x = -Math.PI / 2;
      group.add(line);
    });

    return group;
  }
}

const UNIT_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c];
