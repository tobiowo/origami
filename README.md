# Origami Sonobe Explorer

An interactive 3D guide for folding and assembling modular Sonobe origami polyhedra.

## Overview

This application provides a comprehensive tutorial for creating modular origami. It currently supports:

### Sonobe Units
- **Introductory Animation**: A 3D preview of the full folding sequence.
- **Interactive Folding Simulator**: A step-by-step guide with real-time 3D simulation for folding a single unit.
- **Dynamic Assembly View**: Accurate 3D visualizations for assembling 2 to 270 units into various polyhedra (Jewels, Cubes, Geodesic Spheres).
- **Sandbox Mode**: A free-form space to add, move, and rotate units to create your own modular designs.

### Golden Venture (3D Origami)
- **Interactive Folding Tutorial**: Step-by-step guide to folding the triangular GV unit.
- **Assembly Viewer**: Row-based 3D visualization showing how units interlock in rings.
- **Layout Importer**: Support for importing complex models (swans, vases, etc.) via Base64 strings from the Golden Venture Art Designer.

## Tech Stack

- **Three.js**: 3D rendering engine.
- **Rabbit Ear**: Origami modeling and graph manipulation library.
- **Origami Simulator**: GPU-accelerated folding simulation.
- **Vanilla JS**: Application logic and dynamic step generation.

## Usage

To run the application locally, use a simple static file server. For example, using `npx`:

```bash
npx serve .
```

Then open your browser to `http://localhost:3000`.

## Project Structure

- `index.html`: Main entry point (Sonobe Tutorial).
- `golden-venture.html`: Golden Venture (3D Origami) tutorial and viewer.
- `sandbox.html`: Modular assembly sandbox.
- `animation-test.html`: Standalone folding animation prototype.
- `js/`: Application modules and logic.
  - `lib/`: Third-party dependencies (Rabbit Ear, Origami Simulator).
- `css/`: Application stylesheets.
- `references/`: (Ignored by Git) Original source code, documentation, and screenshots used during development.

## Testing

The project uses **Vitest** for unit testing the geometric logic. Run tests with:

```bash
npx vitest
```
