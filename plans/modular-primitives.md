# Modular Origami Primitives Plan

Implement a `ModularCore` library to formalize connections between origami units using `Port` and `ModularUnit` primitives.

## 1. Data Structure Definitions

### 1.1 The `Port` Primitive
A `Port` represents a physical connection point on a folded unit.
- **Type**: `TAB` (male) or `POCKET` (female).
- **Location**: `THREE.Vector3` (local coordinates relative to unit origin).
- **Orientation**: 
    - `Direction`: A vector pointing "out" of the unit (for alignment).
    - `Normal`: A vector perpendicular to the paper face (to handle "twist" and "flip").
- **State**: `open` | `occupied`.

### 1.2 The `ModularUnit` Primitive
A wrapper that bundles the Rabbit Ear `FOLD` graph with its 3D `Port` metadata.
- **Graph**: The raw FOLD data.
- **Ports**: A list of defined `Port` objects.
- **Transform**: The unit's current `Matrix4` in world space.
- **Logic**: Methods to find its own ports automatically based on graph topology.

### 1.3 The `Assembly` Primitive (The Macro-Graph)
The top-level container for the entire model.
- **Nodes**: `ModularUnit` instances.
- **Edges**: `Connection` objects (Pairing of `Port A` and `Port B`).
- **Function**: Handles the "Solve" logic—propagating transforms across connections.

---

## 2. Implementation Phases

### Phase 1: The Core Library (`js/modular-core.js`)
Extract geometry logic from `sandbox-view.js` and formalize it.
1. Define classes: `Port`, `ModularUnit`, and `Assembly`.
2. **Port Factory**: Helper to generate standard Sonobe ports (2 tabs at tips, 2 pockets at ridge ends).
3. **Alignment Logic**: `alignTo(targetPort, myPort)` method returning the `Matrix4` needed to mate ports.

### Phase 2: Automated Port Detection
Use Rabbit Ear to analyze graph topology:
1. **Tab Detection**: Find "tip" vertices of faces sharing only one edge with another face.
2. **Pocket Detection**: Find ridge endpoints on the boundary.

### Phase 3: Topology Validation
1. **Port Mismatch**: Prevent illegal TAB-TAB or POCKET-POCKET connections.
2. **Cycle Detection**: Verify geometric closure for loops (e.g., 3 units in a ring).

### Phase 4: Refactoring `SandboxView`
1. Replace `this.units` array with an `Assembly` instance.
2. Replace manual `_trySnap` with `Assembly.connect()`.
3. Add persistent connection state.
