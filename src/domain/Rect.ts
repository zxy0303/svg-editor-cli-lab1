import { GeometryShape } from './GeometryShape.js';

export class Rect extends GeometryShape {
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, 'rect', { x, y, width, height });
  }
  protected get horizontal(): readonly string[] { return ['x']; }
  protected get vertical(): readonly string[] { return ['y']; }
  clone(): Rect {
    return this.copyStylesTo(new Rect(this.id, this.numberAt('x'), this.numberAt('y'), this.numberAt('width'), this.numberAt('height')));
  }
}
