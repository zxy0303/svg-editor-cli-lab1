import { GeometryShape } from './GeometryShape.js';

export class Circle extends GeometryShape {
  constructor(id: string, cx: number, cy: number, r: number) { super(id, 'circle', { cx, cy, r }); }
  protected get horizontal(): readonly string[] { return ['cx']; }
  protected get vertical(): readonly string[] { return ['cy']; }
  clone(): Circle {
    return this.copyStylesTo(new Circle(this.id, this.numberAt('cx'), this.numberAt('cy'), this.numberAt('r')));
  }
}
