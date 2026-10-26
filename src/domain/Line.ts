import { GeometryShape } from './GeometryShape.js';

export class Line extends GeometryShape {
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) { super(id, 'line', { x1, y1, x2, y2 }); }
  protected get horizontal(): readonly string[] { return ['x1', 'x2']; }
  protected get vertical(): readonly string[] { return ['y1', 'y2']; }
  clone(): Line {
    return this.copyStylesTo(new Line(this.id, this.numberAt('x1'), this.numberAt('y1'), this.numberAt('x2'), this.numberAt('y2')));
  }
}
