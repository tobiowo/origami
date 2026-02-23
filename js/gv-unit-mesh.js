/**
 * Hardcoded 3D geometry for a single Golden Venture (GV) unit.
 * Used for high-performance assembly rendering.
 */

export function createGVUnitGeometry(THREE) {
  const geo = new THREE.BufferGeometry();
  
  // Dimensions based on a 1.5 x 1.0 paper folded into a unit.
  // Final unit is approx a triangle with base 0.5 and height 0.5.
  // It has a "split" in the middle forming two points and two pockets.
  
  const W = 0.5; // Base width
  const H = 0.5; // Height
  const T = 0.08; // Thickness (pocket gap)
  
  // Center X at W/2, Y at H/2? No, Y=0 should be the base.
  const cx = W / 2;
  const cy = 0;
  
  const vertices = new Float32Array([
    // Front Face (Left Point)
    0-cx, 0-cy, T/2,   W/2-cx, 0-cy, T/2,   W/2-cx, H-cy, T/2,
    // Front Face (Right Point)
    W/2-cx, 0-cy, T/2,   W-cx, 0-cy, T/2,   W/2-cx, H-cy, T/2,
    
    // Back Face (Left Point)
    0-cx, 0-cy, -T/2,  W/2-cx, H-cy, -T/2,  W/2-cx, 0-cy, -T/2,
    // Back Face (Right Point)
    W/2-cx, 0-cy, -T/2,  W/2-cx, H-cy, -T/2,  W-cx, 0-cy, -T/2,
    
    // Left Side
    0-cx, 0-cy, T/2,   W/2-cx, H-cy, T/2,   W/2-cx, H-cy, -T/2,
    0-cx, 0-cy, T/2,   W/2-cx, H-cy, -T/2,  0-cx, 0-cy, -T/2,
    
    // Right Side
    W-cx, 0-cy, T/2,   W/2-cx, H-cy, -T/2,  W/2-cx, H-cy, T/2,
    W-cx, 0-cy, T/2,   W-cx, 0-cy, -T/2,    W/2-cx, H-cy, -T/2,
    
    // Bottom (Pocket Openings)
    0-cx, 0-cy, T/2,   W/2-cx, 0-cy, -T/2,  W/2-cx, 0-cy, T/2,
    0-cx, 0-cy, T/2,   0-cx, 0-cy, -T/2,    W/2-cx, 0-cy, -T/2,
    W/2-cx, 0-cy, T/2, W/2-cx, 0-cy, -T/2,  W-cx, 0-cy, T/2,
    W-cx, 0-cy, T/2,   W/2-cx, 0-cy, -T/2,  W-cx, 0-cy, -T/2,
    
    // Middle Split
    W/2-cx, 0-cy, T/2, W/2-cx, H-cy, T/2,   W/2-cx, H-cy, -T/2,
    W/2-cx, 0-cy, T/2, W/2-cx, H-cy, -T/2,  W/2-cx, 0-cy, -T/2
  ]);

  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  
  return geo;
}
