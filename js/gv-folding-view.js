/**
 * Renderer for the Golden Venture folding tutorial: the generic
 * FoldModelView bound to the GV kinematic fold model.
 */

import { FoldModelView } from './fold-model-view.js';
import { computeGVGeometry } from './gv-fold-model.js';

export class GVFoldingView extends FoldModelView {
  constructor() {
    super(computeGVGeometry, { backColor: 0x4488cc });
  }
}
