# Research Notes: Arbitrary Shape Approximation with Sonobe Units

## Objective
To investigate the feasibility of using Sonobe units (a foundation of modular origami) to approximate arbitrary 3D meshes beyond standard symmetrical polyhedra.

## Implementation: "Surface Spiking" Algorithm
The chosen approach treats the target 3D mesh as a **Deltahedron scaffold**.

### Algorithm Details
1. **Mesh Parsing**: Standard `.obj` files are parsed into vertex and face arrays.
2. **Edge-to-Unit Mapping**: Every unique edge in the mesh is replaced by a single Sonobe unit.
3. **Face Spiking (Stellation)**: 
   - For every face in the mesh, a pyramid apex is calculated based on the face's centroid and surface normal.
   - The height of the "spike" is dynamically scaled relative to the average edge length of the face.
4. **Physical Interlocking**: 
   - Each virtual Sonobe unit is composed of 4 triangles (2 body, 2 tab).
   - Body triangles are aligned with the adjacent face pyramids.
   - Tabs are mathematically tucked into the "pocket" space of the neighboring unit's body.

## Prototype Results
- **Test Model**: VW Beetle (`beetle.obj`, ~2,000 edges).
- **Outcome**: Successfully generated a complex, spiky 3D silhouette of the car made entirely of interlocking modular units.
- **Performance**: The algorithm handles thousands of units in real-time using Three.js and standard vector math.
- **Explode View**: Successfully verified that the "Explode View" logic scales to arbitrary meshes, allowing units to fly away from the mesh surface along their local normals.

## Future Directions
- **Adaptive Remeshing**: Implementing a preprocessing step to convert high-poly or non-triangular meshes into uniform Deltahedrons for more consistent unit distribution.
- **Structural Integrity**: Calculating "pinch points" where Sonobe units might struggle to interlock due to extreme surface curvature.
- **Sheet Optimization**: Mapping the custom units back to a 2D cutting layout for physical fabrication.

## Files Created/Modified
- `js/obj-sonobe-converter.js`: The core logic for mesh parsing and stellation.
- `js/assembly-view-v2.js`: Updated to handle dynamic loading of custom models.
- `js/app.js`: Updated to support asynchronous assembly loading.
- `references/beetle.obj`: Test geometry.
